import { useState, useEffect } from "react";
import { ROUND_STATUS } from "@shared/schema";

interface CountdownTimerProps {
  targetDate: string | null;
  status: string;
  participantCount: number;
}

export function CountdownTimer({ targetDate, status, participantCount }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate || participantCount < 2) {
      setTimeLeft({ minutes: 0, seconds: 0 });
      return;
    }

    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);
      
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 100);

    return () => clearInterval(interval);
  }, [targetDate, participantCount]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (status === ROUND_STATUS.IN_GAME || status === ROUND_STATUS.FINISHED) {
    return (
      <div className="text-6xl md:text-8xl font-black font-mono text-primary tracking-tighter">
        LIVE
      </div>
    );
  }

  if (participantCount < 2) {
    return (
      <div className="text-6xl md:text-8xl font-black font-mono text-white/30 tracking-tighter">
        --:--
      </div>
    );
  }

  return (
    <div className="text-6xl md:text-8xl font-black font-mono text-white tracking-tighter" data-testid="countdown-timer">
      {formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
    </div>
  );
}
