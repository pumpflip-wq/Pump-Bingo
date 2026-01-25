import { storage } from "./storage";
import { db } from "./db";
import {
  participants,
  rounds,
  transactions,
  users,
  type Round,
  type Participant,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { type Round as RoundType, ROUND_STATUS } from "@shared/schema";
import crypto from "crypto";
import { PROTOCOL_CONFIG } from "@shared/config";

const DRAW_INTERVAL_MS = 3000; // draw number every 3s
const POST_WIN_DELAY_MS = 10000; // wait 10s before next round
const STALL_RECOVERY_MS = 10 * 60_000; // 10 min

/* ======================
   Fair Draw Utilities
====================== */
function hashToInt(seed: string, nonce: number): number {
  const h = crypto
    .createHash("sha256")
    .update(`${seed}:${nonce}`)
    .digest("hex");
  return parseInt(h.slice(0, 8), 16);
}

function getDeterministicDraw(seed: string, drawn: number[]): number | null {
  const nonce = drawn.length;
  const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
    (n) => !drawn.includes(n),
  );
  if (!available.length) return null;
  const idx = hashToInt(seed, nonce) % available.length;
  return available[idx];
}

/* ======================
        Game Manager
====================== */
export class GameManager {
  private loopInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start() {
    if (this.loopInterval) return;
    // Server-side tick only
    this.loopInterval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  /* ======================
        Main Loop
  ====================== */
  private async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const latestRound = await storage.getLatestRound();

      if (!latestRound || latestRound.status === ROUND_STATUS.FINISHED) {
        if (
          !latestRound ||
          (latestRound.completedAt &&
            Date.now() - new Date(latestRound.completedAt).getTime() > 1000)
        ) {
          await this.createNewRound();
        }
        return;
      }

      // Recovery for stalled rounds
      if (latestRound.status === ROUND_STATUS.IN_GAME) {
        const lastUpdate = latestRound.startTime
          ? new Date(latestRound.startTime).getTime()
          : 0;
        if (
          Date.now() - lastUpdate > STALL_RECOVERY_MS &&
          !latestRound.winnerId
        ) {
          await storage.updateRound(latestRound.id, {
            status: ROUND_STATUS.FINISHED,
            completedAt: new Date(),
          });
          await this.createNewRound();
          return;
        }
      }

      await this.processRound(latestRound);
    } catch (err) {
      console.error("Game Loop Error:", err);
    } finally {
      this.isProcessing = false;
    }
  }

  /* ======================
        Round Creation
  ====================== */
  private async createNewRound() {
    const latestRound = await storage.getLatestRound();
    const nextId = latestRound ? latestRound.id + 1 : 1;

    const seed = crypto.randomBytes(32).toString("hex").toLowerCase();
    const hash = crypto
      .createHash("sha256")
      .update(seed)
      .digest("hex")
      .toLowerCase();
    const startTime = new Date(Date.now() + 65000); // 65s from now

    await storage.createRound({
      id: nextId,
      status: ROUND_STATUS.OPEN,
      serverSeed: seed,
      publicHash: hash,
      startTime: startTime,
      price: PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE,
      prizePool: 0,
      drawnNumbers: [],
      completedAt: null,
      winnerId: null,
    });

    await this.processPaymentQueue(nextId);
  }

  /* ======================
        Payment Processing
  ====================== */
  private async processPaymentQueue(roundId: number) {
    const pending = await storage.getPendingPayments();
    for (const payment of pending) {
      try {
        // Only process payments for the CURRENT round
        // If a payment was made but the game already started, it should stay pending
        // until the NEXT round is created.
        const round = await storage.getRound(roundId);
        if (!round || round.status !== ROUND_STATUS.OPEN) {
          continue; 
        }

        const existing = await storage.getParticipant(roundId, payment.userId);
        if (existing) {
          await storage.markPaymentProcessed(payment.id);
          continue;
        }

        const card = this.generateCard();
        await storage.joinRound(
          roundId,
          payment.userId,
          card,
          payment.txSignature,
        );

        const paymentAmount = Number(
          payment.amount || PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE,
        );
        await storage.updateRound(roundId, {
          prizePool: Number(round.prizePool || 0) + paymentAmount,
        });

        await storage.markPaymentProcessed(payment.id);
        console.log(
          `[GameManager] Auto-joined queued player ${payment.userId} to round #${roundId}`,
        );
      } catch (err) {
        console.error("Error processing queued payment:", err);
      }
    }
  }

  /* ======================
        Process Round Logic
  ====================== */
  private async processRound(round: Round) {
    const now = new Date();

    // 1. OPEN -> STARTING
    if (round.status === ROUND_STATUS.OPEN) {
      const count = await storage.getRoundParticipantsCount(round.id);

      if (count >= 2) {
        if (!round.startTime) {
          const target = new Date(now.getTime() + 60000);
          await storage.updateRound(round.id, { startTime: target });
          console.log(`[GameManager] Round #${round.id} timer set to 60s for ${count} players`);
          return;
        }

        const startTime = new Date(round.startTime);
        if (now.getTime() >= startTime.getTime()) {
          console.log(`[GameManager] Round #${round.id} timer reached. Transitioning to STARTING...`);
          await storage.updateRound(round.id, {
            status: ROUND_STATUS.STARTING,
          });
        }
      } else if (round.startTime) {
        console.log(`[GameManager] Round #${round.id} resetting timer - not enough players (current: ${count})`);
        await storage.updateRound(round.id, { startTime: null });
      }
    }

    // 2. STARTING -> IN_GAME
    else if (round.status === ROUND_STATUS.STARTING) {
      const startTime = round.startTime instanceof Date ? round.startTime : new Date(round.startTime!);
      const elapsed = now.getTime() - startTime.getTime();
      const count = await storage.getRoundParticipantsCount(round.id);

      if (count < 2) {
        console.log(`[GameManager] Round #${round.id} reverting to OPEN - players left during starting phase`);
        await storage.updateRound(round.id, {
          status: ROUND_STATUS.OPEN,
          startTime: null,
        });
      } else if (elapsed > 5000) {
        console.log(`[GameManager] Round #${round.id} transitioning to IN_GAME`);
        await storage.updateRound(round.id, { 
          status: ROUND_STATUS.IN_GAME,
          startTime: new Date() 
        });
      }
    }

    // 3. IN_GAME -> Draw Numbers
    else if (round.status === ROUND_STATUS.IN_GAME) {
      if (!round.drawnNumbers) round.drawnNumbers = [];

      // Winner already declared
      if (round.winnerId) {
        const winnerTime = round.completedAt
          ? new Date(round.completedAt).getTime()
          : Date.now();
        if (Date.now() - winnerTime >= POST_WIN_DELAY_MS) {
          await storage.updateRound(round.id, {
            status: ROUND_STATUS.FINISHED,
          });
          await this.createNewRound();
        }
        return;
      }

      const startTime = round.startTime!.getTime();
      const elapsed = now.getTime() - startTime;
      const expectedCount = Math.min(
        75,
        Math.floor(elapsed / DRAW_INTERVAL_MS),
      );

      if (round.drawnNumbers.length < expectedCount) {
        const newDrawn = [...round.drawnNumbers];
        while (newDrawn.length < expectedCount) {
          const nextNum = getDeterministicDraw(
            round.serverSeed,
            newDrawn,
          );
          if (nextNum === null) break;
          newDrawn.push(nextNum);
        }
        
        if (newDrawn.length !== round.drawnNumbers.length) {
          await storage.updateRound(round.id, {
            drawnNumbers: newDrawn,
          });
        }
      }
    }
  }

  /* ======================
        Claim Bingo
  ====================== */
  async claimBingo(
    roundId: number,
    userId: number,
    card: number[][],
  ): Promise<boolean> {
    const round = await storage.getRound(roundId);
    if (!round || round.status !== ROUND_STATUS.IN_GAME || round.winnerId)
      return false;

    // Validate first
    const valid = this.validateBingo(card, round.drawnNumbers || []);
    if (!valid) return false;

    // Atomic update
    const updated = await storage.updateRound(roundId, {
      winnerId: userId,
      status: ROUND_STATUS.FINISHED,
      completedAt: new Date(),
    });

    return !!(updated && updated.winnerId === userId);
  }

  /* ======================
        Bingo Utilities
  ====================== */
  generateCard(): number[][] {
    const ranges = [
      [1, 15],
      [16, 30],
      [31, 45],
      [46, 60],
      [61, 75],
    ];
    const cols = ranges.map(([min, max]) =>
      Array.from({ length: max - min + 1 }, (_, i) => i + min)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5),
    );
    cols[2][2] = 0;
    return Array.from({ length: 5 }, (_, r) => cols.map((col) => col[r]));
  }

  validateBingo(card: number[][], drawn: number[]): boolean {
    const set = new Set(drawn);
    // free space is always checked (represented by 0)
    const ok = (n: number) => n === 0 || set.has(n);

    // Rows
    for (let i = 0; i < 5; i++) {
      if (card[i].every(ok)) return true;
    }
    // Columns
    for (let i = 0; i < 5; i++) {
      if (card.map((r) => r[i]).every(ok)) return true;
    }
    // Diagonals
    if ([0, 1, 2, 3, 4].every((i) => ok(card[i][i]))) return true;
    if ([0, 1, 2, 3, 4].every((i) => ok(card[i][4 - i]))) return true;
    
    return false;
  }

  calculateWinProb(card: number[][], drawn: number[]): number {
    const drawnSet = new Set(drawn);
    drawnSet.add(0);
    if (drawn.length <= 1) return 0;

    const lines = [
      ...Array(5)
        .fill(0)
        .map((_, r) => card[r]),
      ...Array(5)
        .fill(0)
        .map((_, c) => card.map((r) => r[c])),
      Array(5)
        .fill(0)
        .map((_, i) => card[i][i]),
      Array(5)
        .fill(0)
        .map((_, i) => card[i][4 - i]),
    ];

    let maxMarked = 0,
      potentialLines = 0,
      totalMarked = 0;

    lines.forEach((line) => {
      const marked = line.filter((n) => drawnSet.has(n)).length;
      if (marked > maxMarked) maxMarked = marked;
      if (marked === 4) potentialLines++;
    });

    card.flat().forEach((num) => {
      if (num !== 0 && drawnSet.has(num)) totalMarked++;
    });

    if (maxMarked === 5) return 100;
    if (totalMarked >= 1 && drawn.length > 0) {
      const hitDensity = (totalMarked / 24) * 15;
      let baseLineProb = 0;
      if (maxMarked === 2) baseLineProb = 5;
      else if (maxMarked === 3) baseLineProb = 20;
      else if (maxMarked === 4) baseLineProb = 50;

      const proximityBonus = potentialLines * 12;
      const gameProgress = (drawn.length / 75) * 10;

      return Math.max(
        1,
        Math.min(
          99,
          Math.floor(baseLineProb + hitDensity + proximityBonus + gameProgress),
        ),
      );
    }

    return 0;
  }

  updateSettings(settings: { price?: number; feePercentage?: number }) {}
}

export const gameManager = new GameManager();
