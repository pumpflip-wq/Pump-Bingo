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
    // Standard 1s tick for high-resolution state management
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
    
    // Safety check: Don't start rounds if MINT_ADDRESS is missing for Mainnet
    if (PROTOCOL_CONFIG.NETWORK === "mainnet-beta" && !PROTOCOL_CONFIG.MINT_ADDRESS) {
      console.log("[GameManager] Mainnet active but MINT_ADDRESS is missing. Waiting for configuration...");
      return;
    }

    this.isProcessing = true;
    try {
      // Use a database advisory lock to ensure only one server processes the game loop at a time
      // This is critical when running multiple server instances (e.g., Replit and Railway)
      // connected to the same database.
      await db.execute(sql`SELECT pg_advisory_xact_lock(12345)`);
      
      let latestRound = await storage.getLatestRound();

      // Check if current round price needs updating (e.g. admin changed config from 0 to >0 or vice-versa)
      if (latestRound && latestRound.status === ROUND_STATUS.OPEN && Number(latestRound.price) !== Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE)) {
        console.log(`[GameManager] Updating round ${latestRound.id} price from ${latestRound.price} to ${PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE}`);
        await storage.updateRound(latestRound.id, {
          price: PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE
        });
        latestRound.price = PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE;
      }
      
      // If no round exists, or the latest round is finished, create a new one
      if (!latestRound || latestRound.status === ROUND_STATUS.FINISHED) {
        const completedAt = latestRound?.completedAt ? new Date(latestRound.completedAt).getTime() : 0;
        const canCreate = !latestRound || (Date.now() - completedAt > 2000);
        
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
    const nextId = (latestRound?.id ?? 0) + 1;
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

    if (round.status === ROUND_STATUS.OPEN) {
      await this.processPaymentQueue(round.id);
    }
  }

  async claimBingo(roundId: number, userId: number, card: number[][]): Promise<boolean> {
    const round = await storage.getRound(roundId);
    if (!round || round.status !== ROUND_STATUS.IN_GAME || round.winnerId) return false;
    if (!validateBingo(card, round.drawnNumbers || [])) return false;

    const allParticipants = await db.select().from(participants).where(eq(participants.roundId, roundId));
    console.log(`[GameManager] Calculating win probs for ${allParticipants.length} players in round #${roundId}`);
    
    // Efficiently update probabilities using a transaction or batch
    await db.transaction(async (tx) => {
      for (const p of allParticipants) {
        const prob = calculateWinProb(p.card as number[][], round.drawnNumbers || []);
        await tx.update(participants).set({ finalWinProb: prob }).where(eq(participants.id, p.id));
      }
    });

    const updated = await storage.updateRound(roundId, {
      winnerId: userId,
      completedAt: new Date(),
      drawnNumbers: round.drawnNumbers, // Persist final drawn numbers state
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
