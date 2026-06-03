import { storage } from "../storage";
import { db } from "../db";
import { participants, ROUND_STATUS, type Round } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { calculateWinProb, validateBingo, generateBingoCard } from "./bingoLogic";
import { getDeterministicDraw } from "./provablyFair";
import { PROTOCOL_CONFIG } from "@shared/config";
import { handleStateTransitions } from "./roundStateMachine";
import crypto from "crypto";

const DRAW_INTERVAL_MS = 3000;

export class GameManager {
  private loopInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start() {
    if (this.loopInterval) return;
    this.loopInterval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  private async tick() {
    if (this.isProcessing) return;

    if (PROTOCOL_CONFIG.NETWORK === "mainnet-beta" && !PROTOCOL_CONFIG.MINT_ADDRESS) {
      console.log("[GameManager] Mainnet active but MINT_ADDRESS is missing. Waiting for configuration...");
      return;
    }

    this.isProcessing = true;
    try {
      // Process both modes sequentially to avoid advisory lock conflicts
      await this.processModeGame("FREE");
      await this.processModeGame("PAID");
    } catch (err) {
      console.error("Game Loop Error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processModeGame(mode: string) {
    // Different lock IDs per mode so they don't block each other
    const lockId = mode === "FREE" ? 12345 : 12346;
    const entryPrice = mode === "FREE" ? 0 : PROTOCOL_CONFIG.PAID_ENTRY_PRICE;

    try {
      await db.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

      let latestRound = await storage.getLatestRoundByMode(mode);

      if (!latestRound || latestRound.status === ROUND_STATUS.FINISHED) {
        const completedAt = latestRound?.completedAt
          ? new Date(latestRound.completedAt).getTime()
          : 0;
        const canCreate =
          !latestRound ||
          Date.now() - completedAt > PROTOCOL_CONFIG.POST_WIN_DELAY_MS;

        if (canCreate) {
          await this.createNewRound(mode, entryPrice);
        }
        return;
      }

      await this.processRound(latestRound);
    } catch (err) {
      console.error(`[GameManager][${mode}] Error:`, err);
    }
  }

  private async createNewRound(mode: string, entryPrice: number) {
    const seed = crypto.randomBytes(32).toString("hex").toLowerCase();
    const hash = crypto
      .createHash("sha256")
      .update(seed)
      .digest("hex")
      .toLowerCase();

    const newRound = await storage.createRound({
      status: ROUND_STATUS.OPEN,
      mode,
      serverSeed: seed,
      publicHash: hash,
      startTime: null,
      price: entryPrice,
      prizePool: 0,
      drawnNumbers: [],
      completedAt: null,
      winnerId: null,
    });

    // Only PAID rounds use the payment queue
    if (mode === "PAID") {
      await this.processPaymentQueue(newRound.id);
    }
  }

  private async processPaymentQueue(roundId: number) {
    const pending = await storage.getPendingPayments();
    for (const payment of pending) {
      try {
        const round = await storage.getRound(roundId);
        if (!round || round.status !== ROUND_STATUS.OPEN) continue;

        const existing = await storage.getParticipant(roundId, payment.userId);
        if (existing) {
          await storage.markPaymentProcessed(payment.id);
          continue;
        }

        const card = generateBingoCard();
        await storage.joinRound(roundId, payment.userId, card, payment.txSignature);

        const paymentAmount = Number(payment.amount || PROTOCOL_CONFIG.PAID_ENTRY_PRICE);
        await storage.updateRound(roundId, {
          prizePool: Number(round.prizePool || 0) + paymentAmount,
        });

        await storage.markPaymentProcessed(payment.id);
        console.log(`[GameManager] Auto-joined queued player ${payment.userId} to round #${roundId}`);
        await this.handlePlayerJoined(roundId);
      } catch (err) {
        console.error("Error processing queued payment:", err);
      }
    }
  }

  private async processRound(round: Round) {
    const now = new Date();
    const count = await storage.getRoundParticipantsCount(round.id);

    await handleStateTransitions(round, count);

    if (round.status === ROUND_STATUS.IN_GAME && !round.winnerId) {
      const startTime = round.startTime ? new Date(round.startTime) : now;
      const elapsed = now.getTime() - startTime.getTime();
      const expectedCount = Math.min(75, Math.floor(elapsed / DRAW_INTERVAL_MS));
      if ((round.drawnNumbers || []).length < expectedCount) {
        const newDrawn = [...(round.drawnNumbers || [])];
        while (newDrawn.length < expectedCount) {
          const nextNum = getDeterministicDraw(round.serverSeed, newDrawn);
          if (nextNum === null) break;
          newDrawn.push(nextNum);
        }
        if (newDrawn.length !== (round.drawnNumbers || []).length) {
          await storage.updateRound(round.id, { drawnNumbers: newDrawn });
        }
      }
    }

    // Process payment queue only for PAID rounds
    if (round.status === ROUND_STATUS.OPEN && (round as any).mode === "PAID") {
      await this.processPaymentQueue(round.id);
    }
  }

  async claimBingo(roundId: number, userId: number, card: number[][]): Promise<boolean> {
    const round = await storage.getRound(roundId);
    if (!round || round.status !== ROUND_STATUS.IN_GAME || round.winnerId) return false;
    if (!validateBingo(card, round.drawnNumbers || [])) return false;

    const allParticipants = await db.select().from(participants).where(eq(participants.roundId, roundId));
    console.log(`[GameManager] Calculating win probs for ${allParticipants.length} players in round #${roundId}`);

    await db.transaction(async (tx) => {
      for (const p of allParticipants) {
        const prob = calculateWinProb(p.card as number[][], round.drawnNumbers || []);
        if (p.finalWinProb !== prob) {
          await tx.update(participants).set({ finalWinProb: prob }).where(eq(participants.id, p.id));
        }
      }
    });

    const currentRound = await storage.getRound(roundId);
    if (!currentRound) return false;

    const updated = await storage.updateRound(roundId, {
      winnerId: userId,
      status: ROUND_STATUS.FINISHED,
      completedAt: new Date(),
      drawnNumbers: currentRound.drawnNumbers || round.drawnNumbers,
    });

    return !!(updated && updated.winnerId === userId);
  }

  async handlePlayerJoined(roundId: number) {
    const round = await storage.getRound(roundId);
    if (!round || round.status !== ROUND_STATUS.OPEN) return;
    const count = await storage.getRoundParticipantsCount(roundId);
    await handleStateTransitions(round, count);
  }

  generateCard() { return generateBingoCard(); }
  updateSettings() {}
}

export const gameManager = new GameManager();
