import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { ROUND_STATUS } from "@shared/schema";

interface CountdownTimerProps {
  secondsRemaining: number;
  status: string;
  participantCount: number;
  isWaitingForPlayers?: boolean;
}

export function CountdownTimer({ secondsRemaining, status, participantCount, isWaitingForPlayers }: CountdownTimerProps) {
  // IMPORTANT: Display-only component - NO local state, NO setInterval
  // Server is the single source of truth for time
  const displaySeconds = Math.max(0, secondsRemaining);
  
  const timeLeft = {
    minutes: Math.floor(displaySeconds / 60),
    seconds: displaySeconds % 60
  };

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  // Always show timer format - show 01:00 when waiting for players or timer not started
  if (isWaitingForPlayers || (status === ROUND_STATUS.OPEN && participantCount < 2) || 
      (status === ROUND_STATUS.OPEN && (secondsRemaining === 0 || !secondsRemaining))) {
    return (
      <div className="text-6xl md:text-8xl font-black font-mono text-white/50 tracking-[0.4em] italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] tabular-nums" data-testid="countdown-timer">
        01:00
      </div>
    );
  }

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

  return (
    <div className="text-6xl md:text-8xl font-black font-mono text-white tracking-[0.4em] italic drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tabular-nums" data-testid="countdown-timer">
      {formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
    </div>
  );
}
