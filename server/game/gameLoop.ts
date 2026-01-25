import { storage } from "../storage";
import { db } from "../db";
import { participants, ROUND_STATUS, type Round } from "@shared/schema";
import { eq } from "drizzle-orm";
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
    this.isProcessing = true;
    try {
      const latestRound = await storage.getLatestRound();
      if (!latestRound || latestRound.status === ROUND_STATUS.FINISHED) {
        const canCreate = !latestRound || (latestRound.status === ROUND_STATUS.FINISHED && latestRound.completedAt && Date.now() - new Date(latestRound.completedAt).getTime() > 2000);
        if (canCreate) {
          await this.createNewRound();
        }
        return;
      }
      await this.processRound(latestRound);
    } catch (err) {
      console.error("Game Loop Error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async createNewRound() {
    const latestRound = await storage.getLatestRound();
    const nextId = latestRound ? latestRound.id + 1 : 1;
    const seed = crypto.randomBytes(32).toString("hex").toLowerCase();
    const hash = crypto.createHash("sha256").update(seed).digest("hex").toLowerCase();
    
    await storage.createRound({
      id: nextId,
      status: ROUND_STATUS.OPEN,
      serverSeed: seed,
      publicHash: hash,
      startTime: null,
      price: PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE,
      prizePool: 0,
      drawnNumbers: [],
      completedAt: null,
      winnerId: null,
    });

    await this.processPaymentQueue(nextId);
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

        const paymentAmount = Number(payment.amount || PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE);
        await storage.updateRound(roundId, {
          prizePool: Number(round.prizePool || 0) + paymentAmount,
        });

        await storage.markPaymentProcessed(payment.id);
        console.log(`[GameManager] Auto-joined queued player ${payment.userId} to round #${roundId}`);
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
      const elapsed = now.getTime() - new Date(round.startTime!).getTime();
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

    if (round.status === ROUND_STATUS.OPEN) {
      await this.processPaymentQueue(round.id);
    }
  }

  async claimBingo(roundId: number, userId: number, card: number[][]): Promise<boolean> {
    const round = await storage.getRound(roundId);
    if (!round || round.status !== ROUND_STATUS.IN_GAME || round.winnerId) return false;
    if (!validateBingo(card, round.drawnNumbers || [])) return false;

    const allParticipants = await db.select().from(participants).where(eq(participants.roundId, roundId));
    for (const p of allParticipants) {
      const prob = calculateWinProb(p.card as number[][], round.drawnNumbers || []);
      await db.update(participants).set({ finalWinProb: prob }).where(eq(participants.id, p.id));
    }

    const updated = await storage.updateRound(roundId, {
      winnerId: userId,
      completedAt: new Date(),
      drawnNumbers: round.drawnNumbers, // Persist final drawn numbers state
    });

    // Create NEW round immediately so people don't join the old one
    console.log(`[Round ${roundId}] Winner declared. Creating new round.`);
    await storage.createRound({
      status: ROUND_STATUS.OPEN,
      price: round.price,
      prizePool: 0,
      drawnNumbers: [],
      startTime: null
    });

    return !!(updated && updated.winnerId === userId);
  }

  generateCard() { return generateBingoCard(); }
  updateSettings() {}
}

export const gameManager = new GameManager();
