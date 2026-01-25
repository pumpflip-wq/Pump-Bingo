import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api } from "@shared/routes";
import { gameManager } from "./game";
import { solanaManager } from "./solana";
import {
  ROUND_STATUS,
  users,
  participants,
  transactions,
} from "@shared/schema";
import { eq, sum, sql } from "drizzle-orm";
import { PROTOCOL_CONFIG } from "../shared/config";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Update game settings
  gameManager.updateSettings({
    price: PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE,
    feePercentage: PROTOCOL_CONFIG.FEE_PERCENTAGE,
  });

  // Start game loop
  gameManager.start();

  // ===== ADMIN STATS =====
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const totalPrizePool = await db
        .select({ value: sum(transactions.amount) })
        .from(transactions)
        .where(eq(transactions.type, "PRIZE"));

      const totalBuyIns = await db
        .select({ value: sum(transactions.amount) })
        .from(transactions)
        .where(eq(transactions.type, "BUY_IN"));

      const userCountResult = await db
        .select({ count: sql`count(*)` })
        .from(users);
      const walletBalance = await solanaManager.getMasterBalance();

      res.json({
        totalDistributed: Math.abs(Number(totalPrizePool[0]?.value || 0)),
        totalRevenue: Math.abs(Number(totalBuyIns[0]?.value || 0)),
        userCount: Number(userCountResult[0]?.count || 0),
        masterWalletBalance: walletBalance,
        masterWalletPublicKey: solanaManager.getMasterPublicKey(),
        masterWalletSymbol: PROTOCOL_CONFIG.SYMBOL,
        isTestMode:
          PROTOCOL_CONFIG.IS_TEST_MODE && !process.env.SOLANA_MASTER_WALLET_KEY,
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ===== PAYMENTS =====
  app.post("/api/payments/queue", async (req, res) => {
    try {
      const payment = await storage.createPaymentQueue(req.body);
      res.json(payment);
    } catch (err) {
      console.error("Payment queue error:", err);
      res.status(500).json({ message: "Failed to queue payment" });
    }
  });

  // ===== AUTH =====
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username } = api.auth.login.input.parse(req.body);
      let user = await storage.getUserByUsername(username);
      if (!user) user = await storage.createUser({ username });
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid ID" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // ===== ROUNDS =====
  app.get(api.rounds.list.path, async (req, res) => {
    const rounds = await storage.getOpenRounds();
    const safeRounds = rounds.map((round) => ({
      ...round,
      serverSeed:
        round.status === ROUND_STATUS.FINISHED ? round.serverSeed : null,
    }));
    res.json(safeRounds);
  });

  app.get("/api/rounds/history", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const history = await storage.getFinishedRoundsPaginated(page, limit);
    res.json(history);
  });

  app.get(api.rounds.get.path, async (req, res) => {
    const roundId = Number(req.params.id);
    if (isNaN(roundId))
      return res.status(400).json({ message: "Invalid round ID" });

    const round = await storage.getRound(roundId);
    if (!round) return res.status(404).json({ message: "Round not found" });

    const count = await storage.getRoundParticipantsCount(roundId);

    const roundParticipantsRaw = await db.execute(sql`
      SELECT p.user_id as "id",
             COALESCE(u.username, 'Unknown') as username,
             p.joined_at as "joinedAt",
             p.card,
             p.final_win_prob as "finalWinProb",
             p.tx_signature as "txSignature"
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.round_id = ${roundId} AND p.tx_signature IS NOT NULL AND p.tx_signature != ''
    `);
    const roundParticipants = (roundParticipantsRaw as any).rows || [];

    // Server-driven timers and status
    let secondsRemaining = 0;
    let nextRoundSecondsRemaining = 0;
    const now = Date.now();
    
    // Logic for WAITING_FOR_PLAYERS state
    const isWaitingForPlayers = round.status === ROUND_STATUS.OPEN && count < 2;

    if (round.startTime && !isWaitingForPlayers) {
      const startMs = new Date(round.startTime).getTime();
      secondsRemaining = Math.max(0, Math.floor((startMs - now) / 1000));
    }

    if (round.winnerId && round.completedAt) {
      const completedMs = new Date(round.completedAt).getTime();
      nextRoundSecondsRemaining = Math.max(
        0,
        Math.ceil((10000 - (now - completedMs)) / 1000),
      );
    }

    const safeRound = {
      ...round,
      serverSeed:
        round.status === ROUND_STATUS.FINISHED ? round.serverSeed : null,
      drawnNumbers: round.drawnNumbers || [],
    };

    res.json({
      round: safeRound,
      participantsCount: count,
      secondsRemaining,
      nextRoundSecondsRemaining,
      isWaitingForPlayers,
      participants: roundParticipants.map((p: any) => ({
        ...p,
        joinedAt:
          p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt,
        card: typeof p.card === "string" ? JSON.parse(p.card) : p.card,
        winRate: p.finalWinProb || 0,
        finalWinProb: p.finalWinProb || 0,
      })),
      status: round.status,
    });
  });

  // ===== JOIN ROUND =====
  app.post(api.rounds.join.path, async (req, res) => {
    try {
      const roundId = Number(req.params.id);
      if (isNaN(roundId))
        return res.status(400).json({ message: "Invalid round ID" });

      const { userId, txSignature } = req.body;
      if (!userId || isNaN(Number(userId)))
        return res.status(400).json({ message: "Invalid user ID" });

      const round = await storage.getRound(roundId);
      if (!round) return res.status(404).json({ message: "Round not found" });

      if (round.status !== ROUND_STATUS.OPEN) {
        if (txSignature) {
          await storage.createPaymentQueue({
            userId: Number(userId),
            txSignature,
            amount: Number(round.price),
            status: "PENDING",
          });
          return res.json({
            queued: true,
            message:
              "Round already started. You will be joined automatically to the next round.",
          });
        }
        return res
          .status(400)
          .json({ message: "Round is no longer open for joining." });
      }

      const existing = await storage.getParticipant(roundId, Number(userId));
      if (existing) {
        const user = await storage.getUser(Number(userId));
        return res.json({
          participant: existing,
          balance: Number(user?.balance || 0),
        });
      }

      const card = gameManager.generateCard();
      const participant = await storage.joinRound(
        roundId,
        Number(userId),
        card,
        txSignature,
      );

      const currentPrize = Number(round.prizePool || 0);
      const entryPrice = Number(round.price || 0);
      await storage.updateRound(roundId, {
        prizePool: currentPrize + entryPrice,
      });

      const user = await storage.getUser(Number(userId));
      res.json({ participant, balance: Number(user?.balance || 0) });

      // Create transaction & update balance in background
      storage
        .createTransaction({
          userId,
          amount: -entryPrice,
          type: "BUY_IN",
          roundId,
        })
        .catch(console.error);
      storage.updateUserBalance(userId, entryPrice * -1).catch(console.error);

      // Verify on Solana in background
      if (txSignature) {
        solanaManager
          .verifyTransaction(
            txSignature,
            entryPrice,
            solanaManager.getMasterPublicKey(),
          )
          .then((valid) => {
            if (!valid) console.error(`Transaction invalid: ${txSignature}`);
          })
          .catch(console.error);
      }
    } catch (err) {
      console.error("Join round error:", err);
      res.status(500).json({ message: "Failed to join round" });
    }
  });

  // ===== CLAIM BINGO =====
  app.post(api.rounds.claim.path, async (req, res) => {
    try {
      const roundId = Number(req.params.id);
      if (isNaN(roundId))
        return res.status(400).json({ message: "Invalid round ID" });

      const { userId } = api.rounds.claim.input.parse(req.body);
      const participant = await storage.getParticipant(roundId, userId);
      if (!participant)
        return res.status(404).json({ message: "Participant not found" });

      const result = await gameManager.claimBingo(
        roundId,
        userId,
        participant.card as number[][],
      );
      if (!result)
        return res
          .status(400)
          .json({
            valid: false,
            message: "Not valid Bingo or already claimed!",
          });

      // Only update hasBingo after validation
      await db
        .update(participants)
        .set({ hasBingo: true })
        .where(
          sql`${participants.roundId} = ${roundId} AND ${participants.userId} = ${userId}`,
        );

      // Process payouts in background (Stats are already persisted in gameManager.claimBingo)
      (async () => {
        try {
          const round = await storage.getRound(roundId);
          if (!round) return;

          const fee = Math.max(
            0,
            Math.min(100, PROTOCOL_CONFIG.FEE_PERCENTAGE || 10),
          );
          const payoutMultiplier = (100 - fee) / 100;
          const payout = Math.floor(Number(round.prizePool) * payoutMultiplier);

          const user = await storage.getUser(userId);
          await solanaManager
            .sendReward(user?.username || "", payout)
            .then((sig) => {
              if (sig) storage.updateRound(roundId, { payoutSignature: sig });
            })
            .catch(console.error);

          await storage.updateUserBalance(userId, payout);
          await storage.createTransaction({
            userId,
            amount: payout,
            type: "PRIZE",
            roundId,
          });
        } catch (err) {
          console.error("Background payout processing error:", err);
        }
      })();

      res.json({ valid: true, message: "BINGO! You won!" });
    } catch (err) {
      console.error("Claim bingo error:", err);
      res.status(500).json({ message: "Failed to claim bingo" });
    }
  });

  // ===== SYSTEM RESET =====
  app.post("/api/admin/reset", async (req, res) => {
    try {
      const { adminWallet } = req.body;
      if (adminWallet !== PROTOCOL_CONFIG.ADMIN_WALLET)
        return res.status(403).json({ message: "Unauthorized" });

      gameManager.stop();
      await storage.resetSystem();
      gameManager.start();

      res.json({ message: "System reset successful" });
    } catch (err: any) {
      console.error("System reset error:", err);
      try {
        gameManager.start();
      } catch (e) {}
      res
        .status(500)
        .json({ message: err.message || "Failed to reset system" });
    }
  });

  return httpServer;
}
