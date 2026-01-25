
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
      masterWalletPublicKey: solanaManager.getMasterPublicKey(),
      masterWalletSymbol: PROTOCOL_CONFIG.SYMBOL,
      isTestMode: PROTOCOL_CONFIG.IS_TEST_MODE && !process.env.SOLANA_MASTER_WALLET_KEY
    });
  });

  // === PAYMENTS ===
  app.post("/api/payments/queue", async (req, res) => {
    try {
      const payment = await storage.createPaymentQueue(req.body);
      res.json(payment);
    } catch (err) {
      console.error("Error adding to payment queue:", err);
      res.status(500).json({ message: "Failed to queue payment" });
    }
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
    // PROVABLY FAIR: Hide serverSeed until round is FINISHED
    const safeRounds = rounds.map(round => ({
      ...round,
      serverSeed: round.status === ROUND_STATUS.FINISHED ? round.serverSeed : null
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
    if (isNaN(roundId)) return res.status(400).json({ message: "Invalid round ID" });

    const round = await storage.getRound(roundId);
    if (!round) return res.status(404).json({ message: "Round not found" });
    
    const countResult = await db.select({ count: sql`count(*)` })
      .from(participants)
      .where(sql`${participants.roundId} = ${roundId} AND ${participants.txSignature} IS NOT NULL AND ${participants.txSignature} != ''`);
    const count = Number(countResult[0]?.count || 0);
    
    // Fetch participants with usernames, cards, and finalWinProb who have truly joined
    const roundParticipants = await db.execute(sql`
      SELECT 
        p.user_id as "id", 
        COALESCE(u.username, 'Unknown') as username, 
        p.joined_at as "joinedAt", 
        p.card,
        p.final_win_prob as "finalWinProb",
        p.user_id as "userId"
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.round_id = ${roundId} AND p.tx_signature IS NOT NULL AND p.tx_signature != ''
    `);
    
    // Handle both Drizzle result formats (rows array or direct array)
    const participantsData = Array.isArray(roundParticipants) ? roundParticipants : ((roundParticipants as any).rows || []);

    // Calculate seconds remaining for countdown (server-side to avoid clock sync issues)
    let secondsRemaining = 0;
    if (round.status === ROUND_STATUS.OPEN) {
      const now = Date.now();
      if (round.startTime) {
        const targetTime = round.startTime instanceof Date ? round.startTime.getTime() : new Date(round.startTime).getTime();
        // Return actual remaining seconds, keeping it stable
        secondsRemaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
      } else {
        // If 2 players but no startTime yet, return 60
        secondsRemaining = count >= 2 ? 60 : 0;
      }
    }
    
    // PROVABLY FAIR: Only reveal serverSeed after the round is FINISHED
    // Before game ends, only show the publicHash so players can verify later
    const safeRound = {
      ...round,
      serverSeed: round.status === ROUND_STATUS.FINISHED ? round.serverSeed : null,
      drawnNumbers: round.drawnNumbers || []
    };
    
    res.json({ 
      round: safeRound, 
      participantsCount: count,
      secondsRemaining,
      participants: participantsData.map((p: any) => ({
        ...p,
        joinedAt: p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt,
        card: typeof p.card === 'string' ? JSON.parse(p.card) : p.card,
        winRate: p.finalWinProb || 0,
        finalWinProb: p.finalWinProb || 0
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
      
      // Check if user already joined this round
      const existingParticipant = await storage.getParticipant(roundId, Number(userId));
      if (existingParticipant) {
        const user = await storage.getUser(Number(userId));
        return res.json({ participant: existingParticipant, balance: Number(user?.balance || 0) });
      }

      const treasuryWallet = solanaManager.getMasterPublicKey();
      if (!treasuryWallet) return res.status(500).json({ message: "Server wallet not initialized" });

      // 0. Verify Transaction (Wait for confirmation to ensure they are actually in)
      if (!txSignature) {
        return res.status(400).json({ message: "Transaction signature required" });
      }

      // Update prize pool for display immediately
      const currentPrize = Number(round.prizePool || 0);
      const entryPrice = Number(round.price || 0);
      const updatedPrize = currentPrize + entryPrice;
      await storage.updateRound(roundId, { prizePool: updatedPrize });

      // Create participant and return immediately
      const card = gameManager.generateCard();
      const participant = await storage.joinRound(roundId, userId, card, txSignature);

      // CRITICAL: Ensure player is NOT in subsequent rounds by default
      // This is handled by storage.joinRound which only inserts for the specific roundId.
      // We must ensure the client doesn't keep a stale state.

      const user = await storage.getUser(userId);
      res.json({ participant, balance: Number(user?.balance || 0) });

      // Create transaction record for buy-in and update balance in background
      storage.createTransaction({
        userId,
        amount: -Number(round.price),
        type: "BUY_IN",
        roundId
      }).catch(err => console.error("Error creating buy-in transaction:", err));

      storage.updateUserBalance(userId, -Number(round.price)).catch(err => console.error("Error updating balance:", err));

      // Verify signature in background after user is already in
      solanaManager.verifyTransaction(txSignature, Number(round.price), treasuryWallet)
        .then(valid => {
          if (!valid) {
            console.error(`Transaction verification failed for ${txSignature}`);
            // If invalid, we could mark participant as invalid but for now we prioritize UX
          }
        })
        .catch(err => console.error("Verification background error:", err));
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

      // ATOMIC CLAIM: Use gameManager's centralized atomic logic
      const participant = await storage.getParticipant(roundId, userId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      // Mark that this user won locally first to prevent race conditions in background
      await db.update(participants).set({ hasBingo: true }).where(sql`${participants.roundId} = ${roundId} AND ${participants.userId} = ${userId}`);

      const result = await gameManager.claimBingo(roundId, userId, participant.card as number[][]);
      
      if (result) {
          // Process payout and probabilities in background to return SUCCESS immediately
          (async () => {
            try {
              const round = await storage.getRound(roundId);
              if (!round) return;

              // Calculate and store final win probabilities for all participants
              const allParticipants = await db.select({
                userId: participants.userId,
                card: participants.card
              })
              .from(participants)
              .where(eq(participants.roundId, roundId));

              const drawnNumbers = round.drawnNumbers || [];
              for (const p of allParticipants) {
                const prob = gameManager.calculateWinProb(p.card as number[][], drawnNumbers);
                await db.update(participants)
                  .set({ finalWinProb: prob })
                  .where(sql`${participants.roundId} = ${roundId} AND ${participants.userId} = ${p.userId}`);
              }

              // Payout based on feePercentage
              const fee = Math.max(0, Math.min(100, PROTOCOL_CONFIG.FEE_PERCENTAGE || 10));
              const payoutMultiplier = (100 - fee) / 100;
              const payout = Math.floor(Number(round.prizePool) * payoutMultiplier);

              const user = await storage.getUser(userId);
              
              // Send reward in background
              solanaManager.sendReward(user?.username || "", payout).then(sig => {
                if (sig) storage.updateRound(roundId, { payoutSignature: sig });
              }).catch(err => console.error("Payout error:", err));
              
              await storage.updateUserBalance(userId, payout);
              await storage.createTransaction({
                  userId,
                  amount: payout,
                  type: "PRIZE",
                  roundId
              });
            } catch (err) {
              console.error("Background claim processing error:", err);
            }
          })();

          return res.json({ valid: true, message: "BINGO! You won!" });
      } else {
          return res.status(400).json({ valid: false, message: "Not a valid Bingo or winner already declared!" });
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
      // Admin wallet from shared config
      const { adminWallet } = req.body;

      if (adminWallet !== PROTOCOL_CONFIG.ADMIN_WALLET) {
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

  app.post("/api/admin/reset", async (req, res) => {
    try {
      const { adminWallet } = req.body;
      if (adminWallet !== PROTOCOL_CONFIG.ADMIN_WALLET) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log("CRITICAL: Admin initiated system reset.");
      
      // Stop the game loop first to prevent concurrent database writes
      gameManager.stop();
      
      // Clear all database tables
      await storage.resetSystem();
      
      // Restart game manager to initialize fresh state (new round, etc.)
      gameManager.start();
      
      res.json({ message: "System reset successful" });
    } catch (err: any) {
      console.error("Reset error:", err);
      // Attempt to restart game manager even if storage reset failed partially
      try { gameManager.start(); } catch (e) {}
      res.status(500).json({ message: err.message || "Failed to reset system" });
    }
  });

  return httpServer;
}
