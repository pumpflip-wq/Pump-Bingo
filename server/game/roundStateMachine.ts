import { storage } from "../storage";
import { ROUND_STATUS, type Round } from "@shared/schema";
import { PROTOCOL_CONFIG } from "@shared/config";

const POST_WIN_DELAY_MS = 10000;

export async function handleStateTransitions(round: Round, participantCount: number): Promise<void> {
  const now = new Date();

  if (round.status === ROUND_STATUS.OPEN) {
    if (participantCount >= 2) {
      if (!round.startTime) {
        // Initialize countdown: 60 seconds from now
        const startTime = new Date(now.getTime() + 60000);
        await storage.updateRound(round.id, { startTime });
        console.log(`[Round ${round.id}] Started countdown to ${startTime.toISOString()}`);
      } else {
        const startTimeMs = new Date(round.startTime).getTime();
        const remaining = Math.ceil((startTimeMs - now.getTime()) / 1000);
        
        if (remaining <= 0) {
          // Move to STARTING state: 5 second delay
          const startingEndTime = new Date(now.getTime() + 5000);
          await storage.updateRound(round.id, {
            status: ROUND_STATUS.STARTING,
            startTime: startingEndTime
          });
          console.log(`[Round ${round.id}] Transitioning to STARTING. Verifying until ${startingEndTime.toISOString()}`);
        }
      }
    } else {
      // Less than 2 players: Ensure startTime is null to signify "Waiting for players"
      if (round.startTime !== null) {
        await storage.updateRound(round.id, { startTime: null });
        console.log(`[Round ${round.id}] Resetting startTime (waiting for players)`);
      }
    }
  } else if (round.status === ROUND_STATUS.STARTING) {
    if (participantCount < 2) {
      // Fallback to OPEN if players leave during starting delay
      await storage.updateRound(round.id, { status: ROUND_STATUS.OPEN, startTime: null });
    } else if (now.getTime() >= new Date(round.startTime!).getTime()) {
      // Move to IN_GAME
      await storage.updateRound(round.id, { status: ROUND_STATUS.IN_GAME, startTime: new Date() });
    }
  } else if (round.status === ROUND_STATUS.IN_GAME) {
    // Only allow the round to finish if a winner has been declared.
    // We remove the condition that automatically ends the game when 75 numbers are drawn.
    const isOver = !!round.winnerId;
    if (isOver) {
      if (!round.completedAt) {
        // Mark completion time if not already set
        await storage.updateRound(round.id, { completedAt: new Date() });
        return;
      }
      const completedTime = new Date(round.completedAt).getTime();
      if (now.getTime() - completedTime >= POST_WIN_DELAY_MS) {
        // Transition to FINISHED
        await storage.updateRound(round.id, { status: ROUND_STATUS.FINISHED });
      }
    }
  }
}
