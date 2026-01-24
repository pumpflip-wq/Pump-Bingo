
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // Acts as "Wallet Address" for MVP
  balance: integer("balance").notNull().default(10000), // Starting fake PUMP tokens
  createdAt: timestamp("created_at").defaultNow(),
});

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("OPEN"), // OPEN, STARTING, IN_GAME, FINISHED
  startTime: timestamp("start_time"),
  price: integer("price").notNull().default(100), // Buy-in price
  prizePool: integer("prize_pool").notNull().default(0),
  winnerId: integer("winner_id"), // Null until won
  serverSeed: text("server_seed").notNull(), // Secret seed for fairness
  publicHash: text("public_hash").notNull(), // SHA256(seed) shown before game
  drawnNumbers: integer("drawn_numbers").array().default([]), // List of numbers drawn so far
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  splMint: text("spl_mint"), // Added for future SPL token integration
  feePercentage: integer("fee_percentage").default(10), // House fee
  payoutSignature: text("payout_signature"), 
});

export const paymentQueue = pgTable("payment_queue", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  txSignature: text("tx_signature").notNull().unique(),
  status: text("status").notNull().default("PENDING"), // PENDING, PROCESSED
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentQueueSchema = createInsertSchema(paymentQueue);
export type PaymentQueue = typeof paymentQueue.$inferSelect;
export type InsertPaymentQueue = z.infer<typeof insertPaymentQueueSchema>;

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  userId: integer("user_id").notNull(),
  card: jsonb("card").notNull(), // 5x5 grid of numbers
  hasBingo: boolean("has_bingo").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
  txSignature: text("tx_signature"), // Solana transaction signature for verification
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // Negative for buy-in, Positive for win
  type: text("type").notNull(), // BUY_IN, PRIZE
  roundId: integer("round_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).pick({ username: true });
export const insertParticipantSchema = createInsertSchema(participants).pick({ roundId: true, userId: true, card: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

// Grid is a 5x5 array of numbers (0-75). 0 can represent "Free" or checked.
export type BingoCard = number[][]; 

export type CreateUserRequest = z.infer<typeof insertUserSchema>;
export type JoinRoundRequest = { roundId: number; userId: number };
export type ClaimBingoRequest = { roundId: number; userId: number };

export const ROUND_STATUS = {
  OPEN: "OPEN",
  STARTING: "STARTING",
  IN_GAME: "IN_GAME",
  FINISHED: "FINISHED",
} as const;

export type RoundStatus = keyof typeof ROUND_STATUS;
