
import { storage } from "./storage";
import { db } from "./db";
import { type Round, ROUND_STATUS, rounds } from "@shared/schema";
import { sql } from "drizzle-orm";
import crypto from "crypto";

// Bingo Game Logic
export class GameManager {
  private loopInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start() {
    if (this.loopInterval) return;
    console.log("Starting Game Manager Loop...");
    this.loopInterval = setInterval(() => this.tick(), 1000); // 1 tick per second
  }

  stop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find the LATEST round
      const [latestRound] = await db.select().from(rounds).orderBy(sql`${rounds.id} DESC`).limit(1);
      
      // If no round exists OR the latest is FINISHED, create a new one
      if (!latestRound || latestRound.status === ROUND_STATUS.FINISHED) {
        await this.createNewRound();
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
    const seed = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Start 60 seconds from now to allow for lobby time
    const startTime = new Date(Date.now() + 60 * 1000); 

    await storage.createRound({
      status: ROUND_STATUS.OPEN,
      serverSeed: seed,
      publicHash: hash,
      startTime: startTime,
      price: 100, // 100 PUMP default
      prizePool: 0,
      drawnNumbers: []
    });
    console.log("Created new round");
  }

  private async processRound(round: Round) {
    const now = new Date();

    // 1. OPEN -> STARTING
    if (round.status === ROUND_STATUS.OPEN) {
      const participantCount = await storage.getRoundParticipantsCount(round.id);
      
      // Only start countdown if we have at least 2 players
      if (participantCount >= 2) {
        if (round.startTime && now >= round.startTime) {
          await storage.updateRound(round.id, { status: ROUND_STATUS.STARTING });
          console.log(`Round ${round.id} starting...`);
        }
      } else {
        // Reset start time if not enough players to keep it 60s in future
        // but only if it's about to expire or already expired
        if (round.startTime && now.getTime() > round.startTime.getTime() - 10000) {
           await storage.updateRound(round.id, { startTime: new Date(Date.now() + 60 * 1000) });
        }
      }
    }

    // 2. STARTING -> IN_GAME
    else if (round.status === ROUND_STATUS.STARTING) {
        // Give it 5 seconds of "Starting" state for hype
        const elapsed = now.getTime() - (round.startTime?.getTime() || 0);
        if (elapsed > 5000) {
            await storage.updateRound(round.id, { status: ROUND_STATUS.IN_GAME });
        }
    }

    // 3. IN_GAME -> Draw Numbers
    else if (round.status === ROUND_STATUS.IN_GAME) {
        if (!round.drawnNumbers) round.drawnNumbers = [];
        
        if (round.drawnNumbers.length >= 75) {
            // No one won? Force finish.
            await storage.updateRound(round.id, { status: ROUND_STATUS.FINISHED });
            return;
        }

        // Draw numbers based on fixed interval
        const now = new Date().getTime();
        const startTime = new Date(round.startTime!).getTime() + 5000; // startTime + STARTING delay
        const elapsed = now - startTime;
        const expectedNumbers = Math.min(75, Math.floor(elapsed / 3000)); // One number every 3 seconds

        if (round.drawnNumbers.length < expectedNumbers) {
            const available = Array.from({length: 75}, (_, i) => i + 1)
                .filter(n => !round.drawnNumbers!.includes(n));
            
            if (available.length > 0) {
                const nextNum = available[Math.floor(Math.random() * available.length)];
                const newNumbers = [...round.drawnNumbers, nextNum];
                await storage.updateRound(round.id, { drawnNumbers: newNumbers });
                console.log(`Round ${round.id} drew number ${nextNum}`);
            }
        }
    }
  }

  // Bingo Card Generation (5x5)
  // Columns: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
  generateCard(): number[][] {
    const card: number[][] = [];
    const ranges = [
      { min: 1, max: 15 },
      { min: 16, max: 30 },
      { min: 31, max: 45 }, // Middle is free in std bingo, but "Pump Bingo" might differ. Let's do standard with Free space = 0.
      { min: 46, max: 60 },
      { min: 61, max: 75 }
    ];

    for (let r = 0; r < 5; r++) {
       const row: number[] = [];
       // Wait, standard bingo is Columns are ranges.
       // So we generate 5 columns, then transpose for rows.
    }
    
    const cols: number[][] = [];
    for (let c = 0; c < 5; c++) {
        const col: number[] = [];
        const { min, max } = ranges[c];
        const candidates = Array.from({length: max - min + 1}, (_, i) => i + min);
        // Shuffle
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        // Take 5
        for(let r=0; r<5; r++) {
            col.push(candidates[r]);
        }
        cols.push(col);
    }

    // Free space
    cols[2][2] = 0; // 0 = Free

    // Transpose to rows for easier rendering if needed, or keep as cols.
    // Let's store as rows (5x5 grid)
    for(let r=0; r<5; r++) {
        const row: number[] = [];
        for(let c=0; c<5; c++) {
            row.push(cols[c][r]);
        }
        card.push(row);
    }

    return card;
  }

  validateBingo(card: number[][], drawn: number[]): boolean {
    // Check rows
    for (let r = 0; r < 5; r++) {
        if (card[r].every(n => n === 0 || drawn.includes(n))) return true;
    }
    // Check cols
    for (let c = 0; c < 5; c++) {
        const col = [card[0][c], card[1][c], card[2][c], card[3][c], card[4][c]];
        if (col.every(n => n === 0 || drawn.includes(n))) return true;
    }
    // Diagonals
    const d1 = [card[0][0], card[1][1], card[2][2], card[3][3], card[4][4]];
    if (d1.every(n => n === 0 || drawn.includes(n))) return true;

    const d2 = [card[0][4], card[1][3], card[2][2], card[3][1], card[4][0]];
    if (d2.every(n => n === 0 || drawn.includes(n))) return true;

    return false;
  }
}

export const gameManager = new GameManager();
