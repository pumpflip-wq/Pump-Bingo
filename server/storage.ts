import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { PROTOCOL_CONFIG } from "../shared/config";
import {
  users,
  rounds,
  participants,
  transactions,
  paymentQueue,
  type User,
  type Round,
  type Participant,
  type Transaction,
  type CreateUserRequest,
  type PaymentQueue,
  type InsertPaymentQueue,
  ROUND_STATUS,
} from "@shared/schema";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUserBalance(id: number, amount: number): Promise<User>;

  // Round
  getRound(id: number): Promise<Round | undefined>;
  getLatestRound(): Promise<Round | undefined>;
  getLatestRoundByMode(mode: string): Promise<Round | undefined>;
  getOpenRounds(): Promise<Round[]>;
  createRound(round: Partial<Round>): Promise<Round>;
  updateRound(id: number, updates: Partial<Round>): Promise<Round>;

  // Participant
  joinRound(
    roundId: number,
    userId: number,
    card: number[][],
    txSignature?: string,
  ): Promise<Participant>;
  getParticipant(
    roundId: number,
    userId: number,
  ): Promise<Participant | undefined>;
  getParticipantById(id: number): Promise<Participant | undefined>;
  getRoundParticipantsCount(roundId: number): Promise<number>;
  getRecentFinishedRounds(): Promise<
    (Round & { winnerUsername: string | null; winnerUserId: number | null })[]
  >;
  getFinishedRoundsPaginated(
    page: number,
    limit: number,
  ): Promise<{
    rounds: (Round & { winnerUsername: string | null; winnerUserId: number | null })[];
    total: number;
  }>;

  // Transactions
  createTransaction(tx: Partial<Transaction>): Promise<Transaction>;

  // Payment Queue
  getPendingPayments(): Promise<PaymentQueue[]>;
  getPendingPaymentByUser(userId: number): Promise<PaymentQueue | undefined>;
  createPaymentQueue(payment: InsertPaymentQueue): Promise<PaymentQueue>;
  markPaymentProcessed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    if (!id || isNaN(id)) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (err) {
      console.error("Storage getUserByUsername error:", err);
      return undefined;
    }
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values({ 
        username: user.username, 
        balance: 10000 
      }).returning();
      return newUser;
    } catch (err) {
      console.error("Storage createUser error:", err);
      throw err;
    }
  }

  async updateUserBalance(id: number, amount: number | string): Promise<User> {
    const numericAmount =
      typeof amount === "string" ? parseInt(amount, 10) : amount;
    const [updated] = await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${numericAmount}` })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getRound(id: number): Promise<Round | undefined> {
    if (!id || isNaN(id)) return undefined;
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }

  async getLatestRound(): Promise<Round | undefined> {
    const [round] = await db
      .select()
      .from(rounds)
      .orderBy(sql`${rounds.id} DESC`)
      .limit(1);
    return round;
  }

  async getLatestRoundByMode(mode: string): Promise<Round | undefined> {
    const [round] = await db
      .select()
      .from(rounds)
      .where(sql`${rounds.mode} = ${mode}`)
      .orderBy(sql`${rounds.id} DESC`)
      .limit(1);
    return round;
  }

  async getOpenRounds(): Promise<Round[]> {
    const freeRound = await this.getLatestRoundByMode('FREE');
    const paidRound = await this.getLatestRoundByMode('PAID');
    const result: Round[] = [];
    if (freeRound) result.push(freeRound);
    if (paidRound) result.push(paidRound);
    return result;
  }

  async createRound(round: Partial<Round>): Promise<Round> {
    const [newRound] = await db
      .insert(rounds)
      .values(round as any)
      .returning();
    return newRound;
  }

  async updateRound(id: number, updates: Partial<Round>): Promise<Round> {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.drawnNumbers) {
      // Ensure it's stored as a simple array for Drizzle/PG
      cleanUpdates.drawnNumbers = Array.isArray(cleanUpdates.drawnNumbers) ? cleanUpdates.drawnNumbers : [];
    }
    
    const [updated] = await db
      .update(rounds)
      .set(cleanUpdates)
      .where(eq(rounds.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Failed to update round ${id}: Round not found`);
    }

    return updated;
  }

  async joinRound(
    roundId: number,
    userId: number,
    card: number[][],
    txSignature?: string,
  ): Promise<Participant> {
    const existing = await this.getParticipant(roundId, userId);
    if (existing) return existing;

    const cardJson = JSON.stringify(card);
    const res = await db.execute(sql`
      INSERT INTO participants (round_id, user_id, card, tx_signature, final_win_prob) 
      VALUES (${roundId}, ${userId}, ${cardJson}::jsonb, ${txSignature}, 0)
      RETURNING id, round_id, user_id, card, has_bingo, joined_at, tx_signature, final_win_prob
    `);
    const row = res.rows?.[0] as any;

    // Trigger Game Manager to check if round should start
    import("./game").then(m => {
      m.gameManager.handlePlayerJoined(roundId).catch(console.error);
    });

    return {
      id: row.id,
      roundId: row.round_id,
      userId: row.user_id,
      card: row.card,
      hasBingo: row.has_bingo,
      finalWinProb: row.final_win_prob || 0,
      joinedAt: row.joined_at,
      txSignature: row.tx_signature,
    } as Participant;
  }

  async getParticipant(
    roundId: number,
    userId: number,
  ): Promise<Participant | undefined> {
    if (!roundId || isNaN(roundId) || !userId || isNaN(userId))
      return undefined;
    const res = await db.execute(
      sql`SELECT id, round_id, user_id, card, has_bingo, joined_at, tx_signature, final_win_prob FROM participants WHERE round_id = ${roundId} AND user_id = ${userId}`,
    );
    const row = res.rows?.[0] as any;
    if (!row) return undefined;
    return {
      id: row.id,
      roundId: row.round_id,
      userId: row.user_id,
      card: row.card,
      hasBingo: row.has_bingo,
      joinedAt: row.joined_at,
      txSignature: row.tx_signature,
      finalWinProb: row.final_win_prob || 0,
    } as Participant;
  }

  async getParticipantById(id: number): Promise<Participant | undefined> {
    if (!id || isNaN(id)) return undefined;
    const res = await db.execute(
      sql`SELECT id, round_id, user_id, card, has_bingo, joined_at, tx_signature, final_win_prob FROM participants WHERE id = ${id}`,
    );
    const row = res.rows?.[0] as any;
    if (!row) return undefined;
    return {
      id: row.id,
      roundId: row.round_id,
      userId: row.user_id,
      card: row.card,
      hasBingo: row.has_bingo,
      joinedAt: row.joined_at,
      txSignature: row.tx_signature,
      finalWinProb: row.final_win_prob || 0,
    } as Participant;
  }

  async getRoundParticipantsCount(roundId: number): Promise<number> {
    if (!roundId || isNaN(roundId)) return 0;
    const [result] = await db
      .select({ count: sql<string>`count(DISTINCT user_id)` })
      .from(participants)
      .where(
        sql`${participants.roundId} = ${roundId}`
      );
    return parseInt(result.count || "0", 10);
  }

  async getRecentFinishedRounds(): Promise<
    (Round & { winnerUsername: string | null; winnerUserId: number | null })[]
  > {
    const results = await db
      .select({ round: rounds, winnerUsername: users.username })
      .from(rounds)
      .leftJoin(users, eq(rounds.winnerId, users.id))
      .where(eq(rounds.status, ROUND_STATUS.FINISHED))
      .orderBy(sql`${rounds.id} DESC`)
      .limit(10);
    return results.map((r) => ({
      ...r.round,
      winnerUsername: r.winnerUsername,
      winnerUserId: r.round.winnerId ? Number(r.round.winnerId) : null,
    }));
  }

  async getFinishedRoundsPaginated(
    page: number,
    limit: number,
  ): Promise<{
    rounds: (Round & { winnerUsername: string | null; winnerUserId: number | null })[];
    total: number;
  }> {
    const offset = (page - 1) * limit;
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rounds)
      .where(eq(rounds.status, ROUND_STATUS.FINISHED));
    
    // Explicitly select columns to avoid potential issues with result mapping
    const results = await db
      .select({ 
        id: rounds.id,
        status: rounds.status,
        startTime: rounds.startTime,
        price: rounds.price,
        prizePool: rounds.prizePool,
        winnerId: rounds.winnerId,
        serverSeed: rounds.serverSeed,
        publicHash: rounds.publicHash,
        drawnNumbers: rounds.drawnNumbers,
        completedAt: rounds.completedAt,
        createdAt: rounds.createdAt,
        winnerUsername: users.username 
      })
      .from(rounds)
      .leftJoin(users, eq(rounds.winnerId, users.id))
      .where(eq(rounds.status, ROUND_STATUS.FINISHED))
      .orderBy(sql`${rounds.id} DESC`)
      .limit(limit)
      .offset(offset);

    return {
      total: Number(countResult.count),
      rounds: results.map((r) => ({
        ...r,
        winnerUsername: r.winnerUsername,
        winnerUserId: r.winnerId ? Number(r.winnerId) : null,
      } as any)),
    };
  }

  async getRoundTransactions(roundId: number): Promise<Transaction[]> {
    if (!roundId || isNaN(roundId)) return [];
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.roundId, roundId));
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    if (!userId || isNaN(userId)) return [];
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.id} DESC`);
  }

  async createTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    const [newTx] = await db
      .insert(transactions)
      .values(tx as any)
      .returning();
    return newTx;
  }

  async getPendingPayments(): Promise<PaymentQueue[]> {
    return await db
      .select()
      .from(paymentQueue)
      .where(eq(paymentQueue.status, "PENDING"));
  }

  async getPendingPaymentByUser(userId: number): Promise<PaymentQueue | undefined> {
    if (!userId || isNaN(userId)) return undefined;
    const [payment] = await db
      .select()
      .from(paymentQueue)
      .where(sql`${paymentQueue.userId} = ${userId} AND ${paymentQueue.status} = 'PENDING'`);
    return payment;
  }

  async createPaymentQueue(payment: InsertPaymentQueue): Promise<PaymentQueue> {
    const [newPayment] = await db
      .insert(paymentQueue)
      .values(payment)
      .returning();
    return newPayment;
  }

  async markPaymentProcessed(id: number): Promise<void> {
    await db
      .update(paymentQueue)
      .set({ status: "PROCESSED" })
      .where(eq(paymentQueue.id, id));
  }

  async resetSystem(): Promise<void> {
    await db.execute(sql`
      DO $$ 
      BEGIN
        TRUNCATE "transactions", "participants", "rounds", "users" RESTART IDENTITY CASCADE;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_queue') THEN
          EXECUTE 'TRUNCATE "payment_queue" RESTART IDENTITY CASCADE';
        END IF;
      END $$;
    `);
    // After truncate, let's explicitly reset the rounds identity just to be safe
    await db.execute(sql`ALTER SEQUENCE rounds_id_seq RESTART WITH 1;`);
  }
}

export const storage = new DatabaseStorage();
