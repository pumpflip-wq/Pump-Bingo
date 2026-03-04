import { storage } from "../storage";
import { ROUND_STATUS, type Round } from "@shared/schema";
import { PROTOCOL_CONFIG } from "@shared/config";

const POST_WIN_DELAY_MS = 10000;

export async function handleStateTransitions(round: Round, participantCount: number): Promise<void> {
  const now = new Date();
    const isFreeMode = Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) === 0;
    const minPlayers = 1; // MVP always 1
    const isWaitingForPlayers = participantCount < minPlayers;

    if (round.status === ROUND_STATUS.OPEN) {
      if (!isWaitingForPlayers) {
        if (!round.startTime) {
          // 3s countdown for ultra-fast testing
          const startTime = new Date(now.getTime() + 3000);
          await storage.updateRound(round.id, { startTime });
          console.log(`[Round ${round.id}] Started countdown to ${startTime.toISOString()}`);
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
        await storage.updateRound(round.id, { startTime: null });
      }
    } else if (round.status === ROUND_STATUS.IN_GAME) {
    // Only allow the round to finish if a winner has been declared.
    // We remove the condition that automatically ends the game when 75 numbers are drawn.
    const isOver = !!round.winnerId;
    if (isOver) {
      if (!round.completedAt) {
        // Mark completion time if not already set
        const completedAt = new Date();
        await storage.updateRound(round.id, { completedAt });
        return;
      }
      const completedTime = new Date(round.completedAt).getTime();
      const postWinDelay = PROTOCOL_CONFIG.POST_WIN_DELAY_MS || 10000;
      if (now.getTime() - completedTime >= postWinDelay) {
        // Transition to FINISHED
        await storage.updateRound(round.id, { status: ROUND_STATUS.FINISHED });
      }
    }
  }
}
