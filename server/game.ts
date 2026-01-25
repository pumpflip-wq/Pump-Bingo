import { storage } from "./storage";
import { type Round, ROUND_STATUS } from "@shared/schema";
import crypto from "crypto";
import { PROTOCOL_CONFIG } from "@shared/config";

const OPEN_DELAY_MS = 60_000;
const STARTING_MS = 5_000;
const DRAW_INTERVAL_MS = 1_500; 
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
    // Faster tick for more responsive game state transitions
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
  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find the LATEST round
      const latestRound = await storage.getLatestRound();
      
      // If no round exists OR the latest is FINISHED
      if (!latestRound || latestRound.status === ROUND_STATUS.FINISHED) {
        // Only create if we haven't already just created one (prevents race condition)
        if (!latestRound || (latestRound.completedAt && Date.now() - new Date(latestRound.completedAt).getTime() > 1000)) {
           await this.createNewRound();
        }
        return;
      }

      // Recovery: If a round is IN_GAME but hasn't drawn numbers for a while, it might have stalled
      if (latestRound.status === ROUND_STATUS.IN_GAME) {
          const lastUpdate = latestRound.startTime ? new Date(latestRound.startTime).getTime() : 0;
          const stallThreshold = 10 * 60 * 1000; // 10 minutes for recovery
          if (Date.now() - lastUpdate > stallThreshold && !latestRound.winnerId) {
              await storage.updateRound(latestRound.id, { status: ROUND_STATUS.FINISHED, completedAt: new Date() });
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

  private async createNewRound() {
    const latestRound = await storage.getLatestRound();
    const nextId = latestRound ? latestRound.id + 1 : 1;

    const seed = crypto.randomBytes(32).toString('hex').toLowerCase();
    const hash = crypto.createHash('sha256').update(seed).digest('hex').toLowerCase();
    
    // Default wait time is 60 seconds
    const now = Date.now();
    const startTime = new Date(now + 65000); 

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
      winnerId: null 
    });

    // Process payment queue for the new round
    await this.processPaymentQueue(nextId);
  }

  private async processPaymentQueue(roundId: number) {
    const pending = await storage.getPendingPayments();
    for (const payment of pending) {
      try {
        const card = this.generateCard();
        await storage.joinRound(roundId, payment.userId, card, payment.txSignature);
        
        // Add to prize pool
        const round = await storage.getRound(roundId);
        if (round) {
          const currentPrize = Number(round.prizePool || 0);
          const paymentAmount = Number(payment.amount || 0);
          await storage.updateRound(roundId, { prizePool: currentPrize + paymentAmount });
        }

        await storage.markPaymentProcessed(payment.id);
      } catch (err) {
        console.error("Error processing queued payment:", err);
      }
    }
  }

  private async processRound(round: Round) {
    const now = new Date();

    // 1. OPEN -> STARTING
    if (round.status === ROUND_STATUS.OPEN) {
      const participantCount = await storage.getRoundParticipantsCount(round.id);
      
      // Only allow the countdown to progress if we have at least 2 players
      if (participantCount >= 2) {
        if (!round.startTime) {
            // If we just reached 2 players and have no start time, set it to 60s from now
            await storage.updateRound(round.id, { startTime: new Date(now.getTime() + 60000) });
            return;
        }

        const startTime = new Date(round.startTime);
        const diff = startTime.getTime() - now.getTime();
        
        // If the start time is too far in the future (>60s), reset it to exactly 60s
        if (diff > 60000) {
           await storage.updateRound(round.id, { startTime: new Date(now.getTime() + 60000) });
           return;
        }

        if (now >= startTime) {
          await storage.updateRound(round.id, { status: ROUND_STATUS.STARTING });
        }
      } else {
        // Not enough players: strictly freeze the start time at 60s in the future
        const sixtySecondsFromNow = new Date(now.getTime() + 61000);
        
        // Always ensure it's at least 60s away if under capacity
        const currentStartTime = round.startTime ? new Date(round.startTime) : null;
        if (!currentStartTime || currentStartTime.getTime() < sixtySecondsFromNow.getTime()) {
           await storage.updateRound(round.id, { startTime: sixtySecondsFromNow });
        }
      }
    }

    // 2. STARTING -> IN_GAME
    else if (round.status === ROUND_STATUS.STARTING) {
        // 5 second "Starting" hype phase
        const elapsed = now.getTime() - (round.startTime?.getTime() || 0);
        const participantCount = await storage.getRoundParticipantsCount(round.id);

        if (participantCount < 2) {
            // Revert if players leave during the hype phase
            await storage.updateRound(round.id, { 
                status: ROUND_STATUS.OPEN,
                startTime: new Date(Date.now() + 60 * 1000) 
            });
        } else if (elapsed > 5000) {
            await storage.updateRound(round.id, { status: ROUND_STATUS.IN_GAME });
        }
    }

    // 3. IN_GAME -> Draw Numbers
    else if (round.status === ROUND_STATUS.IN_GAME) {
        if (!round.drawnNumbers) round.drawnNumbers = [];
        
        // Check if winner was already declared (e.g. via claim route)
        if (round.winnerId) {
            // Wait exactly 10 seconds post-win before moving to FINISHED
            const winnerDeclaredAt = round.completedAt ? new Date(round.completedAt).getTime() : Date.now();
            
            if (Date.now() - winnerDeclaredAt >= 10000) {
                await storage.updateRound(round.id, { status: ROUND_STATUS.FINISHED });
                await this.createNewRound();
            }
            return;
        }

        // AUTO-FINISH disabled per user request - only finish when Bingo claimed
        if (round.drawnNumbers.length >= 75 && !round.winnerId) {
            // Keep drawing loop active but don't finish
            return;
        }

        // Draw one number every 3 seconds for balanced gameplay
        const startTime = new Date(round.startTime!).getTime() + 5000;
        const elapsed = now.getTime() - startTime;
        // Granular draw timing
        const expectedNumbersCount = Math.max(0, Math.min(75, Math.floor(elapsed / 3000)));

        if (round.drawnNumbers.length < expectedNumbersCount) {
            const available = Array.from({length: 75}, (_, i) => i + 1)
                .filter(n => !round.drawnNumbers!.includes(n));
            
            if (available.length > 0) {
                const nextNum = available[Math.floor(Math.random() * available.length)];
                const newNumbers = [...round.drawnNumbers, nextNum];
                await storage.updateRound(round.id, { drawnNumbers: newNumbers });
            }
        }
    }
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
    if (!claimed || !claimed.winnerId) return false;

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
          // If already in this round, just mark as processed to prevent duplicate joins
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
        
        console.log(`[GameManager] Processed pending payment for user ${p.userId} in round #${roundId}`);
      } catch (err) {
        console.error("Error processing pending payment:", err);
      }
    }
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
