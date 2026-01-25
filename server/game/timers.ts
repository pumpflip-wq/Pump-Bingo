import { ROUND_STATUS } from "@shared/schema";

export function calculateTimeRemaining(startTime: Date | string | null, status: string, now: number = Date.now()): { 
  secondsRemaining: number; 
  nextRoundSecondsRemaining: number;
} {
  let secondsRemaining = 0;
  let nextRoundSecondsRemaining = 0;

  if (startTime) {
    const startMs = new Date(startTime).getTime();
    secondsRemaining = Math.max(0, Math.floor((startMs - now) / 1000));
  }

  // Next round timer is handled separately based on completedAt in the route
  return { secondsRemaining, nextRoundSecondsRemaining };
}
