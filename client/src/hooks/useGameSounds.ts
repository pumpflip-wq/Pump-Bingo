import { useEffect, useState } from 'react';
import { useSound } from '@/contexts/SoundContext';

export function useGameSounds(roundStatus: string, timeLeft: { minutes: number; seconds: number }, participantCount: number) {
  const { playSound } = useSound();
  const [lastTick, setLastTick] = useState<number>(-1);

  useEffect(() => {
    // Tick sound for last 5 seconds of countdown
    if (roundStatus === 'OPEN' || roundStatus === 'STARTING') {
      if (timeLeft.minutes === 0 && timeLeft.seconds > 0 && timeLeft.seconds <= 5 && timeLeft.seconds !== lastTick) {
        playSound("/sounds/tick.mp3", 0.3);
        setLastTick(timeLeft.seconds);
      }
    }

    // Start sound when game begins
    if (roundStatus === 'IN_GAME' && timeLeft.minutes === 0 && timeLeft.seconds === 0 && lastTick !== 0) {
      playSound("/sounds/start.mp3", 0.5);
      setLastTick(0);
    }
  }, [roundStatus, timeLeft.seconds, timeLeft.minutes, playSound, lastTick]);

  useEffect(() => {
    // Sound when timer first starts (at 60s)
    if (timeLeft.minutes === 1 && timeLeft.seconds === 0 && participantCount >= 2) {
      playSound("/sounds/start.mp3", 0.5);
    }
  }, [timeLeft.seconds, timeLeft.minutes, participantCount, playSound]);
}
