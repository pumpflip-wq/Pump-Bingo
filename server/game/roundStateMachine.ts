import { storage } from "../storage";
import { ROUND_STATUS, type Round } from "@shared/schema";

const POST_WIN_DELAY_MS = 10000;

export async function handleStateTransitions(round: Round, participantCount: number): Promise<void> {
  const now = new Date();
  const minPlayers = 2;
  const isWaitingForPlayers = participantCount < minPlayers;

  if (round.status === ROUND_STATUS.OPEN) {
    if (!isWaitingForPlayers) {
      if (!round.startTime) {
        const startTime = new Date(now.getTime() + 60000);
        await storage.updateRound(round.id, { startTime });
        console.log(`[Round ${round.id}][${(round as any).mode || 'FREE'}] Started 60s countdown to ${startTime.toISOString()}`);
      } else {
        const startTimeMs = new Date(round.startTime).getTime();
        if (now.getTime() >= startTimeMs) {
          await storage.updateRound(round.id, {
            status: ROUND_STATUS.IN_GAME,
            startTime: new Date()
          });
          console.log(`[Round ${round.id}][${(round as any).mode || 'FREE'}] Transitioning to IN_GAME.`);
        }
      }
    } else if (round.startTime) {
      await storage.updateRound(round.id, { startTime: null });
      console.log(`[Round ${round.id}][${(round as any).mode || 'FREE'}] Players left. Resetting countdown.`);
    }
  } else if (round.status === ROUND_STATUS.IN_GAME) {
    const isOver = !!round.winnerId;
    if (isOver) {
      if (!round.completedAt) {
        const completedAt = new Date();
        await storage.updateRound(round.id, { completedAt });
        console.log(`[Round ${round.id}] Winner declared: ${round.winnerId}. Setting completedAt: ${completedAt.toISOString()}`);
        return;
      }
    }
  }
}
