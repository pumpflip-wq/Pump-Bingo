
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { gameManager } from "./game";
import { ROUND_STATUS } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Start the Game Loop
  gameManager.start();

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username } = api.auth.login.input.parse(req.body);
      let user = await storage.getUserByUsername(username);
      
      if (!user) {
        user = await storage.createUser({ username });
        // Give welcome bonus for MVP
        // await storage.updateUserBalance(user.id, 10000); 
      }
      
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid Request" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
      const user = await storage.getUser(Number(req.params.id));
      if(!user) return res.status(404).json({message: "User not found"});
      res.json(user);
  });

  // === ROUNDS ===
  app.get(api.rounds.list.path, async (req, res) => {
    const rounds = await storage.getOpenRounds();
    res.json(rounds);
  });

  app.get(api.rounds.get.path, async (req, res) => {
    const roundId = Number(req.params.id);
    const round = await storage.getRound(roundId);
    if (!round) return res.status(404).json({ message: "Round not found" });
    
    const count = await storage.getRoundParticipantsCount(roundId);
    res.json({ round, participantsCount: count });
  });

  app.post(api.rounds.join.path, async (req, res) => {
    try {
      const roundId = Number(req.params.id);
      const { userId } = api.rounds.join.input.parse(req.body);

      const round = await storage.getRound(roundId);
      if (!round) return res.status(404).json({ message: "Round not found" });
      
      if (round.status !== "OPEN") {
          return res.status(400).json({ message: "Round is already in progress or finished" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.balance < round.price) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Check if already joined
      const existing = await storage.getParticipant(roundId, userId);
      if (existing) {
        return res.status(400).json({ message: "Already joined this round" });
      }

      // Deduct Balance
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
      const participant = await storage.joinRound(roundId, userId, card);

      const updatedUser = await storage.getUser(userId); // get new balance

      res.json({ participant, balance: updatedUser?.balance || 0 });

    } catch (err) {
       console.error(err);
       res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.rounds.claim.path, async (req, res) => {
      const roundId = Number(req.params.id);
      const { userId } = api.rounds.claim.input.parse(req.body);

      const round = await storage.getRound(roundId);
      const participant = await storage.getParticipant(roundId, userId);

      if (!round || !participant) return res.status(404).json({ message: "Not found" });
      if (round.status !== ROUND_STATUS.IN_GAME) return res.status(400).json({ message: "Game not active" });

      const hasBingo = gameManager.validateBingo(participant.card as number[][], round.drawnNumbers || []);
      
      if (hasBingo) {
          // WINNER!
          await storage.updateRound(roundId, { 
              status: ROUND_STATUS.FINISHED, 
              winnerId: userId 
          });
          
          // Payout (90%)
          const payout = Math.floor(round.prizePool * 0.9);
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
  });

  app.get(api.participants.get.path, async (req, res) => {
      const { roundId, userId } = req.params;
      const participant = await storage.getParticipant(Number(roundId), Number(userId));
      if (!participant) return res.status(404).json({ message: "Not found" });
      res.json(participant);
  });

  return httpServer;
}
