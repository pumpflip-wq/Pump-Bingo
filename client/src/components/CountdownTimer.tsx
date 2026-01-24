import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { ROUND_STATUS } from "@shared/schema";

interface CountdownTimerProps {
  targetDate: string | null;
  status: string;
  participantCount: number;
}

export function CountdownTimer({ targetDate, status, participantCount }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 1, seconds: 0 });

  useEffect(() => {
    if (participantCount < 2) {
      setTimeLeft({ minutes: 1, seconds: 0 });
      return;
    }
    
    if (!targetDate) {
      setTimeLeft({ minutes: 1, seconds: 0 });
      return;
    }

    const calculateTimeLeft = () => {
      if (!targetDate) return;
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        return;
      }
      
      const totalSeconds = Math.ceil(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      setTimeLeft({ minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 100);

    return () => clearInterval(interval);
  }, [targetDate, participantCount]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (status === ROUND_STATUS.STARTING) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <motion.div
            animate={{ 
              rotate: 360
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Lock className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
        <div className="text-3xl font-black font-mono text-primary tracking-[0.3em] animate-pulse uppercase italic">
          Verifying
        </div>
      </div>
    );
  }

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
    <div className="text-6xl md:text-8xl font-black font-mono text-white tracking-[0.4em] italic drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tabular-nums" data-testid="countdown-timer">
      {formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
    </div>
  );
}
