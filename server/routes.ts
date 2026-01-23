
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api } from "@shared/routes";
import { gameManager } from "./game";
import { solanaManager } from "./solana";
import { ROUND_STATUS, users, participants, transactions } from "@shared/schema";
import { eq, desc, sum, sql } from "drizzle-orm";
import { PROTOCOL_CONFIG } from "../shared/config";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Update game settings from config
  gameManager.updateSettings({
    price: PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE,
    feePercentage: PROTOCOL_CONFIG.FEE_PERCENTAGE
  });

  // Start the Game Loop
  gameManager.start();

  // === ADMIN STATS ===
  app.get("/api/admin/stats", async (req, res) => {
    // Basic admin check (could be improved with proper auth)
    const totalPrizePool = await db.select({ value: sum(transactions.amount) })
      .from(transactions)
      .where(eq(transactions.type, "PRIZE"));
    
    const totalBuyIns = await db.select({ value: sum(transactions.amount) })
      .from(transactions)
      .where(eq(transactions.type, "BUY_IN"));

    const userCountResult = await db.select({ count: sql`count(*)` }).from(users);
    const walletBalance = await solanaManager.getMasterBalance();

    res.json({
      totalDistributed: Math.abs(Number(totalPrizePool[0]?.value || 0)),
      totalRevenue: Math.abs(Number(totalBuyIns[0]?.value || 0)),
      userCount: Number(userCountResult[0]?.count || 0),
      masterWalletBalance: walletBalance,
      isTestMode: PROTOCOL_CONFIG.IS_TEST_MODE && !process.env.SOLANA_MASTER_WALLET_KEY
    });
  });

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username } = api.auth.login.input.parse(req.body);
      // username is the wallet address
      let user = await storage.getUserByUsername(username);
      
      if (!user) {
        user = await storage.createUser({ username });
      }
      
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid Request" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid ID" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // === ROUNDS ===
  app.get(api.rounds.list.path, async (req, res) => {
    const rounds = await storage.getOpenRounds();
    res.json(rounds);
  });

  app.get("/api/rounds/history", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const history = await storage.getFinishedRoundsPaginated(page, limit);
    res.json(history);
  });

  app.get(api.rounds.get.path, async (req, res) => {
    const roundId = Number(req.params.id);
    if (isNaN(roundId)) return res.status(400).json({ message: "Invalid round ID" });

    const round = await storage.getRound(roundId);
    if (!round) return res.status(404).json({ message: "Round not found" });
    
    const count = await storage.getRoundParticipantsCount(roundId);
    
    // Fetch participants with usernames and cards
    const roundParticipants = await db.select({
      id: users.id,
      username: users.username,
      joinedAt: participants.joinedAt,
      card: participants.card
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .where(eq(participants.roundId, roundId));

    res.json({ 
      round, 
      participantsCount: count,
      participants: roundParticipants.map(p => ({
        ...p,
        joinedAt: p.joinedAt?.toISOString() || "",
        card: p.card
      }))
    });
  });

  app.post(api.rounds.join.path, async (req, res) => {
    try {
      const roundId = Number(req.params.id);
      if (isNaN(roundId)) return res.status(400).json({ message: "Invalid round ID" });

      const { userId, txSignature } = req.body;
      if (!userId || isNaN(Number(userId))) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const round = await storage.getRound(roundId);
      if (!round) return res.status(404).json({ message: "Round not found" });
      
      if (round.status !== "OPEN") {
          return res.status(400).json({ message: "Round is already in progress or finished" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Check if already joined
      const existing = await storage.getParticipant(roundId, userId);
      if (existing) {
        return res.status(400).json({ message: "Already joined this round" });
      }

      // Check if user has enough balance
      if (user.balance < round.price) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct from balance
      await storage.updateUserBalance(userId, -round.price);
      await storage.createTransaction({
        userId,
        amount: -round.price,
        type: "BUY_IN",
        roundId
      });

      // Add to prize pool
      await storage.updateRound(roundId, { prizePool: round.prizePool + round.price });

      // Generate Card
      const card = gameManager.generateCard();
      const participant = await storage.joinRound(roundId, userId, card, txSignature);

      const updatedUser = await storage.getUser(userId); // get new balance

      res.json({ participant, balance: updatedUser?.balance || 0 });

    } catch (err) {
       console.error("Error joining round:", err);
       res.status(500).json({ message: "Failed to join round. Please try again." });
    }
  });

  app.post(api.rounds.claim.path, async (req, res) => {
    try {
      const roundId = Number(req.params.id);
      if (isNaN(roundId)) return res.status(400).json({ message: "Invalid round ID" });

      const { userId } = api.rounds.claim.input.parse(req.body);

      const round = await storage.getRound(roundId);
      const participant = await storage.getParticipant(roundId, userId);

      if (!round || !participant) return res.status(404).json({ message: "Not found" });
      if (round.status !== ROUND_STATUS.IN_GAME) return res.status(400).json({ message: "Game not active" });

      const hasBingo = gameManager.validateBingo(participant.card as number[][], round.drawnNumbers || []);
      
      if (hasBingo) {
          // Payout based on feePercentage
          const fee = Math.max(0, Math.min(100, PROTOCOL_CONFIG.FEE_PERCENTAGE || 10));
          const payoutMultiplier = (100 - fee) / 100;
          const payout = Math.floor(round.prizePool * payoutMultiplier);

          // WINNER!
          // Important: payout variable must be defined before calling solanaManager
          const txSignature = await solanaManager.sendReward(participant.username, payout);

          await storage.updateRound(roundId, { 
              status: ROUND_STATUS.IN_GAME, // Keep in game for the 10s delay
              winnerId: userId,
              completedAt: new Date(), // Use this as "winnerDeclaredAt" effectively
              txHash: txSignature || undefined
          });
          
          await storage.updateUserBalance(userId, payout);
          await storage.createTransaction({
              userId,
              amount: payout,
              type: "PRIZE",
              roundId
          });

          return res.json({ valid: true, message: "BINGO! You won!" });
      } else {
          return res.json({ valid: false, message: "Not a valid Bingo yet!" });
      }
    } catch (err) {
      console.error("Error claiming bingo:", err);
      res.status(500).json({ message: "Failed to claim bingo" });
    }
  });

  app.get(api.participants.get.path, async (req, res) => {
      const { roundId, userId } = req.params;
      const rId = Number(roundId);
      const uId = Number(userId);
      if (isNaN(rId) || isNaN(uId)) return res.status(400).json({ message: "Invalid IDs" });
      const participant = await storage.getParticipant(rId, uId);
      if (!participant) return res.status(404).json({ message: "Not found" });
      res.json(participant);
  });

  app.post(api.rounds.get.path + "/force-start", async (req, res) => {
    try {
      // Basic admin restriction on the backend as well
      const ADMIN_WALLET = "DajB37qp74UzwND3N1rVWtLdxr55nhvuK2D4x476zmns";
      const { adminWallet } = req.body;

      if (adminWallet !== ADMIN_WALLET) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const roundId = Number(req.params.id);
      if (isNaN(roundId)) return res.status(400).json({ message: "Invalid round ID" });

      const round = await storage.getRound(roundId);
      if (!round) return res.status(404).json({ message: "Round not found" });

      if (round.status !== ROUND_STATUS.OPEN) {
        return res.status(400).json({ message: "Round is not in OPEN state" });
      }

      await storage.updateRound(roundId, { 
        status: ROUND_STATUS.STARTING,
        startTime: new Date()
      });

      res.json({ message: "Round force started" });
    } catch (err) {
      console.error("Error force starting round:", err);
      res.status(500).json({ message: "Failed to force start round" });
    }
  });

  app.get(api.auth.me.path + "/transactions", async (req, res) => {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid ID" });
    const userTxs = await storage.getUserTransactions(userId);
    res.json(userTxs);
  });

  app.post("/api/admin/reset", async (_req, res) => {
    // In a real app, check for admin auth here
    await storage.resetSystem();
    res.json({ message: "System reset successful" });
  });

  return httpServer;
}
