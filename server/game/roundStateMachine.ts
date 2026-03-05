import { storage } from "../storage";
import { ROUND_STATUS, type Round } from "@shared/schema";
import { PROTOCOL_CONFIG } from "@shared/config";

const POST_WIN_DELAY_MS = 10000;

export async function handleStateTransitions(round: Round, participantCount: number): Promise<void> {
  const now = new Date();
    const isFreeMode = Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) === 0;
    const minPlayers = 2; 
    const isWaitingForPlayers = participantCount < minPlayers;

    if (round.status === ROUND_STATUS.OPEN) {
      if (!isWaitingForPlayers) {
        if (!round.startTime) {
          // 60s countdown as requested by user
          const startTime = new Date(now.getTime() + 60000);
          await storage.updateRound(round.id, { startTime });
          console.log(`[Round ${round.id}] Started 60s countdown to ${startTime.toISOString()}`);
        } else {
          const startTimeMs = new Date(round.startTime).getTime();
          if (now.getTime() >= startTimeMs) {
            await storage.updateRound(round.id, {
              status: ROUND_STATUS.IN_GAME,
              startTime: new Date()
            });
            console.log(`[Round ${round.id}] Transitioning to IN_GAME.`);
          }
        }
      } else if (round.startTime) {
        // Reset countdown if players leave
        await storage.updateRound(round.id, { startTime: null });
        console.log(`[Round ${round.id}] Players left. Resetting countdown.`);
      }
    } else if (round.status === ROUND_STATUS.IN_GAME) {
    // Only allow the round to finish if a winner has been declared.
    const isOver = !!round.winnerId;
    if (isOver) {
      if (!round.completedAt) {
        // Mark completion time if not already set
        const completedAt = new Date();
        await storage.updateRound(round.id, { completedAt });
        console.log(`[Round ${round.id}] Winner declared: ${round.winnerId}. Setting completedAt: ${completedAt.toISOString()}`);
        return;
      }
    }
  }
}
