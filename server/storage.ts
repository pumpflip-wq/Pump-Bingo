
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { 
  users, rounds, participants, transactions, paymentQueue,
  type User, type Round, type Participant, type Transaction, type CreateUserRequest,
  type PaymentQueue, type InsertPaymentQueue,
  ROUND_STATUS
} from "@shared/schema";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUserBalance(id: number, amount: number): Promise<User>; // amount can be negative

  // Round
  getRound(id: number): Promise<Round | undefined>;
  getLatestRound(): Promise<Round | undefined>;
  getOpenRounds(): Promise<Round[]>;
  createRound(round: Partial<Round>): Promise<Round>;
  updateRound(id: number, updates: Partial<Round>): Promise<Round>;
  
  // Participant
  joinRound(roundId: number, userId: number, card: number[][], txSignature?: string): Promise<Participant>;
  getParticipant(roundId: number, userId: number): Promise<Participant | undefined>;
  getRoundParticipantsCount(roundId: number): Promise<number>;
  getRecentFinishedRounds(): Promise<(Round & { winnerUsername: string | null })[]>;
  getFinishedRoundsPaginated(page: number, limit: number): Promise<{ rounds: (Round & { winnerUsername: string | null })[], total: number }>;
  
  // Transactions
  createTransaction(tx: Partial<Transaction>): Promise<Transaction>;

  // Payment Queue
  getPendingPayments(): Promise<PaymentQueue[]>;
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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...user,
      balance: 1000000 // Grant starting balance for testing
    }).returning();
    return newUser;
  }

  async updateUserBalance(id: number, amount: number | string): Promise<User> {
    const numericAmount = typeof amount === "string" ? parseInt(amount, 10) : amount;
    const [updated] = await db.update(users)
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
    const [round] = await db.select().from(rounds)
      .orderBy(sql`${rounds.id} DESC`)
      .limit(1);
    return round;
  }

  async getOpenRounds(): Promise<Round[]> {
    // Return only the most recent round, regardless of status
    const latest = await this.getLatestRound();
    return latest ? [latest] : [];
  }

  async createRound(round: Partial<Round>): Promise<Round> {
    const [newRound] = await db.insert(rounds).values(round as any).returning();
    return newRound;
  }

  async updateRound(id: number, updates: Partial<Round>): Promise<Round> {
    const [updated] = await db.update(rounds)
      .set({
        ...updates,
        completedAt: updates.status === ROUND_STATUS.FINISHED ? new Date() : updates.completedAt
      })
      .where(eq(rounds.id, id))
      .returning();
    return updated;
  }

  async joinRound(roundId: number, userId: number, card: number[][], txSignature?: string): Promise<Participant> {
    const [participant] = await db.insert(participants)
      .values({ roundId, userId, card, txSignature })
      .returning();
    return participant;
  }

  async getParticipant(roundId: number, userId: number): Promise<Participant | undefined> {
    if (!roundId || isNaN(roundId) || !userId || isNaN(userId)) return undefined;
    const [participant] = await db.select().from(participants)
      .where(sql`${participants.roundId} = ${roundId} AND ${participants.userId} = ${userId}`);
    return participant;
  }

  async getRoundParticipantsCount(roundId: number): Promise<number> {
    if (!roundId || isNaN(roundId)) return 0;
    const [result] = await db.select({ count: sql<number>`count(*)` })
        .from(participants)
        .where(eq(participants.roundId, roundId));
    return Number(result.count || 0);
  }

  async getRecentFinishedRounds(): Promise<(Round & { winnerUsername: string | null })[]> {
    const results = await db.select({
      round: rounds,
      winnerUsername: users.username
    })
    .from(rounds)
    .leftJoin(users, eq(rounds.winnerId, users.id))
    .where(eq(rounds.status, ROUND_STATUS.FINISHED))
    .orderBy(sql`${rounds.id} DESC`)
    .limit(10);
    
    return results.map(r => ({
      ...r.round,
      winnerUsername: r.winnerUsername
    }));
  }

  async getFinishedRoundsPaginated(page: number, limit: number): Promise<{ rounds: (Round & { winnerUsername: string | null })[], total: number }> {
    const offset = (page - 1) * limit;
    
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(rounds)
      .where(eq(rounds.status, ROUND_STATUS.FINISHED));
    
    const results = await db.select({
      round: rounds,
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
      rounds: results.map(r => ({
        ...r.round,
        winnerUsername: r.winnerUsername
      }))
    };
  }

  async getRoundTransactions(roundId: number): Promise<Transaction[]> {
    if (!roundId || isNaN(roundId)) return [];
    return await db.select().from(transactions).where(eq(transactions.roundId, roundId));
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    if (!userId || isNaN(userId)) return [];
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(sql`${transactions.id} DESC`);
  }

  async createTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(tx as any).returning();
    return newTx;
  }

  async getPendingPayments(): Promise<PaymentQueue[]> {
    return await db.select().from(paymentQueue).where(eq(paymentQueue.status, "PENDING"));
  }

  async createPaymentQueue(payment: InsertPaymentQueue): Promise<PaymentQueue> {
    const [newPayment] = await db.insert(paymentQueue).values(payment).returning();
    return newPayment;
  }

  async markPaymentProcessed(id: number): Promise<void> {
    await db.update(paymentQueue).set({ status: "PROCESSED" }).where(eq(paymentQueue.id, id));
  }

  async resetSystem(): Promise<void> {
    // Drop all tables and recreate them to ensure a clean state
    await db.execute(sql`TRUNCATE transactions, participants, rounds, payment_queue RESTART IDENTITY CASCADE`);
  }
}

export const storage = new DatabaseStorage();
