
import { storage } from "./storage";
import { db } from "./db";
import { type Round, ROUND_STATUS, rounds } from "@shared/schema";
import { sql } from "drizzle-orm";
import crypto from "crypto";

// Bingo Game Logic
export class GameManager {
  private price = 100;
  private feePercentage = 10;

  updateSettings(settings: { price: number; feePercentage: number }) {
    this.price = settings.price;
    this.feePercentage = settings.feePercentage;
  }

  start() {
    if (this.loopInterval) return;
    console.log("Starting Game Manager Loop...");
    this.loopInterval = setInterval(() => this.tick(), 1000); // 1 tick per second
  }

  private loopInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

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
    
    // Default wait time is 60 seconds
    const now = Date.now();
    const startTime = new Date(now + 60 * 1000); 

    await storage.createRound({
      status: ROUND_STATUS.OPEN,
      serverSeed: seed,
      publicHash: hash,
      startTime: startTime,
      price: this.price, 
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
      
      // Only allow the countdown to progress if we have at least 2 players
      if (participantCount >= 2) {
        if (!round.startTime || (new Date(round.startTime).getTime() - now.getTime()) > 60000) {
            // If we just reached 2 players, set the countdown to start from 60s
            await storage.updateRound(round.id, { startTime: new Date(now.getTime() + 60 * 1000) });
            return;
        }

        if (round.startTime && now >= round.startTime) {
          await storage.updateRound(round.id, { status: ROUND_STATUS.STARTING });
          console.log(`Round ${round.id} starting...`);
        }
      } else {
        // Not enough players: strictly freeze the start time at exactly 60s in the future
        const sixtySecondsFromNow = new Date(now.getTime() + 60000);
        
        // We only update if it's not already roughly 60s (to avoid constant DB writes)
        const currentStartTime = round.startTime ? new Date(round.startTime) : null;
        const diff = currentStartTime ? Math.abs(currentStartTime.getTime() - sixtySecondsFromNow.getTime()) : Infinity;
        
        if (diff > 2000) { // Update if off by more than 2 seconds
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
            console.log(`Round ${round.id} reverted to OPEN - not enough players`);
        } else if (elapsed > 5000) {
            await storage.updateRound(round.id, { status: ROUND_STATUS.IN_GAME });
            console.log(`Round ${round.id} is now IN_GAME`);
        }
    }

    // 3. IN_GAME -> Draw Numbers
    else if (round.status === ROUND_STATUS.IN_GAME) {
        if (!round.drawnNumbers) round.drawnNumbers = [];
        
        // Check if winner was already declared (e.g. via claim route)
        if (round.winnerId) {
            await storage.updateRound(round.id, { status: ROUND_STATUS.FINISHED });
            return;
        }

        if (round.drawnNumbers.length >= 75) {
            // Stop drawing but keep game open for winner claim
            return;
        }

        // Draw one number every 2.5 seconds for balanced gameplay
        const startTime = new Date(round.startTime!).getTime() + 5000;
        const elapsed = now.getTime() - startTime;
        const expectedNumbersCount = Math.min(75, Math.floor(elapsed / 2500));

        if (round.drawnNumbers.length < expectedNumbersCount) {
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
  generateCard(): number[][] {
    const card: number[][] = [];
    const ranges = [
      { min: 1, max: 15 },
      { min: 16, max: 30 },
      { min: 31, max: 45 },
      { min: 46, max: 60 },
      { min: 61, max: 75 }
    ];
    
    const cols: number[][] = [];
    for (let c = 0; c < 5; c++) {
        const col: number[] = [];
        const { min, max } = ranges[c];
        const candidates = Array.from({length: max - min + 1}, (_, i) => i + min);
        
        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        
        for(let r=0; r<5; r++) {
            col.push(candidates[r]);
        }
        cols.push(col);
    }

    // Standard Free space
    cols[2][2] = 0; 

    // Transpose columns to rows
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
    if (!drawn || drawn.length < 4) return false; // Minimum 4 numbers needed for bingo (including free space)
    const isMarked = (n: number) => n === 0 || drawn.includes(n);

    // Rows
    for (let r = 0; r < 5; r++) {
        if (card[r].every(isMarked)) return true;
    }
    // Cols
    for (let c = 0; c < 5; c++) {
        const col = [card[0][c], card[1][c], card[2][c], card[3][c], card[4][c]];
        if (col.every(isMarked)) return true;
    }
    // Diagonals
    const d1 = [card[0][0], card[1][1], card[2][2], card[3][3], card[4][4]];
    if (d1.every(isMarked)) return true;

    const d2 = [card[0][4], card[1][3], card[2][2], card[3][1], card[4][0]];
    if (d2.every(isMarked)) return true;

    return false;
  }
}

export const gameManager = new GameManager();
