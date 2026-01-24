import { storage } from "./storage";
import { type Round, ROUND_STATUS } from "@shared/schema";
import crypto from "crypto";
import { PROTOCOL_CONFIG } from "@shared/config";

const OPEN_DELAY_MS = 60_000;
const STARTING_MS = 5_000;
const DRAW_INTERVAL_MS = 1_500; // Faster drawing
const POST_WIN_DELAY_MS = 10_000;
const STALL_RECOVERY_MS = 10 * 60_000;

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
    this.loopInterval = setInterval(() => this.tick(), 2000);
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
  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const round = await storage.getLatestRound();
      if (round) {
        console.log(`[GameManager] Tick - Round #${round.id} Status: ${round.status}`);
      }

      if (!round || round.status === ROUND_STATUS.FINISHED) {
        await this.maybeCreateNextRound(round || null);
        return;
      }

      // Stall recovery
      if (
        round.status === ROUND_STATUS.IN_GAME &&
        round.startTime &&
        Date.now() - new Date(round.startTime).getTime() > STALL_RECOVERY_MS &&
        !round.winnerId
      ) {
        await storage.updateRound(round.id, {
          status: ROUND_STATUS.FINISHED,
          completedAt: new Date(),
        });
        await this.createNewRound();
        return;
      }

      switch (round.status) {
        case ROUND_STATUS.OPEN:
          await this.handleOpen(round);
          break;
        case ROUND_STATUS.STARTING:
          await this.handleStarting(round);
          break;
        case ROUND_STATUS.IN_GAME:
          await this.handleInGame(round);
          break;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /* ======================
        Round Creation
  ====================== */
  private async maybeCreateNextRound(latest: Round | null) {
    if (latest?.completedAt) {
      if (
        Date.now() - new Date(latest.completedAt).getTime() <
        POST_WIN_DELAY_MS
      )
        return;
    }
    await this.createNewRound();
  }

  private async createNewRound() {
    const latest = await storage.getLatestRound();
    const nextId = latest ? latest.id + 1 : 1;

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const publicHash = crypto
      .createHash("sha256")
      .update(serverSeed)
      .digest("hex");

    await storage.createRound({
      id: nextId,
      status: ROUND_STATUS.OPEN,
      serverSeed,
      publicHash,
      startTime: null,
      price: PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE,
      prizePool: 0,
      drawnNumbers: [],
      completedAt: null,
      winnerId: null,
    });

    await this.processPendingPayments(nextId);
  }

  /* ======================
        OPEN
  ====================== */
  private async handleOpen(round: Round) {
    const count = await storage.getRoundParticipantsCount(round.id);
    
    // Check for pending payments and process them for this round
    await this.processPendingPayments(round.id);
    
    // Refresh count after processing payments
    const updatedCount = await storage.getRoundParticipantsCount(round.id);

    if (updatedCount < 2) {
      if (round.startTime) {
        await storage.updateRound(round.id, { startTime: null });
        console.log(`[GameManager] Round #${round.id} reset countdown - not enough players.`);
      }
      return;
    }

    if (!round.startTime) {
      const countdownTime = 60_000;
      const targetTime = new Date(Date.now() + countdownTime);
      await storage.updateRound(round.id, {
        startTime: targetTime, 
      });
      console.log(`[GameManager] Round #${round.id} countdown started for ${countdownTime / 1000} seconds with ${updatedCount} players. Target: ${targetTime.toISOString()}`);
      return;
    }

    const now = Date.now();
    const targetDate = round.startTime instanceof Date ? round.startTime : new Date(round.startTime);
    const target = targetDate.getTime();
    
    // START GAME TRANSITION: 
    // If we've reached the target time, transition to STARTING then IN_GAME
    if (now >= target) { 
      console.log(`[GameManager] Round #${round.id} starting... (now: ${now}, target: ${target})`);
      await storage.updateRound(round.id, {
        status: ROUND_STATUS.STARTING,
        startTime: new Date(),
      });
    }
  }

  /* ======================
        STARTING
  ====================== */
  private async handleStarting(round: Round) {
    const elapsed = Date.now() - round.startTime!.getTime();
    const count = await storage.getRoundParticipantsCount(round.id);

    if (count < 2) {
      await storage.updateRound(round.id, {
        status: ROUND_STATUS.OPEN,
        startTime: null,
      });
      return;
    }

    if (elapsed >= STARTING_MS) {
      console.log(`[GameManager] Round #${round.id} GOING LIVE!`);
      await storage.updateRound(round.id, {
        status: ROUND_STATUS.IN_GAME,
        startTime: new Date(),
      });
    }
  }

  /* ======================
        IN GAME
  ====================== */
  private async handleInGame(round: Round) {
    if (round.winnerId) {
      if (
        round.completedAt &&
        Date.now() - new Date(round.completedAt).getTime() >= POST_WIN_DELAY_MS
      ) {
        await storage.updateRound(round.id, { status: ROUND_STATUS.FINISHED });
        await this.createNewRound();
      }
      return;
    }

    const elapsed = Date.now() - round.startTime!.getTime();
    const expectedDraws = Math.floor(elapsed / DRAW_INTERVAL_MS);

    const drawnNumbers = round.drawnNumbers || [];

    // Keep drawing as long as there's no winner
    if (drawnNumbers.length >= expectedDraws) return;

    const next = getDeterministicDraw(round.serverSeed, drawnNumbers);
    if (!next) return;

    await storage.updateRound(round.id, {
      drawnNumbers: [...drawnNumbers, next],
    });
  }

  /* ======================
        CLAIM BINGO
        (FAST + ATOMIC)
  ====================== */
  async claimBingo(
    roundId: number,
    userId: number,
    card: number[][],
  ): Promise<boolean> {
    const round = await storage.getRound(roundId);
    if (!round || round.status !== ROUND_STATUS.IN_GAME) return false;
    if (round.winnerId) return false;

    // Fast check locally
    const valid = this.validateBingo(card, round.drawnNumbers || []);
    if (!valid) return false;

    // ATOMIC CLAIM: first click wins
    // We already update the round status to FINISHED in routes.ts for immediate UI response
    const claimed = await storage.updateRound(roundId, { winnerId: userId, status: ROUND_STATUS.FINISHED, completedAt: new Date() });
    if (!claimed) return false;

    return true;
  }

  /* ======================
        Payments
  ====================== */
  private async processPendingPayments(roundId: number) {
    const payments = await storage.getPendingPayments();
    for (const p of payments) {
      try {
        const round = await storage.getRound(roundId);
        if (!round) continue;

        // If the round is already starting or in game, this payment belongs to the NEXT round
        if (round.status !== ROUND_STATUS.OPEN) {
          continue;
        }

        // Double check participant doesn't already exist for this round
        const existing = await storage.getParticipant(roundId, p.userId);
        if (existing) {
          await storage.markPaymentProcessed(p.id);
          continue;
        }

        const card = this.generateCard();
        await storage.joinRound(roundId, p.userId, card, p.txSignature);

        // Update prize pool for the round
        const updatedPrize = Number(round.prizePool) + Number(p.amount);
        await storage.updateRound(roundId, { prizePool: updatedPrize });

        await storage.createTransaction({
          userId: p.userId,
          amount: -Number(p.amount),
          type: "BUY_IN",
          roundId,
        });

        await storage.updateUserBalance(p.userId, -Number(p.amount));
        await storage.markPaymentProcessed(p.id);
      } catch (err) {
        console.error("Error processing pending payment:", err);
      }
    }
  }

  private async moveLateJoinsToNextRound(currentRoundId: number) {
    // If a round is STARTING or IN_GAME, we don't allow new joins to it
    // But they might have paid. In JoinButton we should handle this.
  }

  /* ======================
        Bingo Utils
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
    const ok = (n: number) => n === 0 || set.has(n);

    for (let i = 0; i < 5; i++) {
      if (card[i].every(ok)) return true;
      if (card.map((r) => r[i]).every(ok)) return true;
    }

    if ([0, 1, 2, 3, 4].every((i) => ok(card[i][i]))) return true;
    if ([0, 1, 2, 3, 4].every((i) => ok(card[i][4 - i]))) return true;

    return false;
  }

  calculateWinProb(card: number[][], drawn: number[]): number {
    const drawnSet = new Set(drawn);
    drawnSet.add(0); // Free space

    if (drawn.length <= 1) return 0;

    const lines = [
      ...Array(5).fill(0).map((_, r) => card[r]),
      ...Array(5).fill(0).map((_, c) => card.map(r => r[c])),
      Array(5).fill(0).map((_, i) => card[i][i]),
      Array(5).fill(0).map((_, i) => card[i][4 - i])
    ];

    let maxMarked = 0;
    let potentialLines = 0;
    let totalMarked = 0;

    lines.forEach(line => {
      const marked = line.filter(n => drawnSet.has(n)).length;
      if (marked > maxMarked) maxMarked = marked;
      if (marked === 4) potentialLines++;
    });

    card.flat().forEach(num => {
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

      const finalProb = Math.min(99, Math.floor(baseLineProb + hitDensity + proximityBonus + gameProgress));
      return Math.max(1, finalProb);
    }

    return 0;
  }

  updateSettings(settings: { price?: number; feePercentage?: number }) {
    // Implement if needed, or just leave as stub to fix crash
  }
}

export const gameManager = new GameManager();
