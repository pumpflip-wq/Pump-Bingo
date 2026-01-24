import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ROUND_STATUS } from "@shared/schema";

interface CountdownTimerProps {
  secondsRemaining: number;
  status: string;
  participantCount: number;
}

export function CountdownTimer({ secondsRemaining, status, participantCount }: CountdownTimerProps) {
  const [displaySeconds, setDisplaySeconds] = useState(60);
  const lastServerSeconds = useRef(60);
  const lastUpdateTime = useRef(Date.now());
  const hasReceivedValidCountdown = useRef(false);

  useEffect(() => {
    // If waiting for players, reset to default
    if (participantCount < 2) {
      setDisplaySeconds(60);
      lastServerSeconds.current = 60;
      hasReceivedValidCountdown.current = false;
      return;
    }

    // When server sends new secondsRemaining > 0, update our reference point
    if (secondsRemaining > 0) {
      hasReceivedValidCountdown.current = true;
      if (secondsRemaining !== lastServerSeconds.current) {
        lastServerSeconds.current = secondsRemaining;
        lastUpdateTime.current = Date.now();
        setDisplaySeconds(secondsRemaining);
      }
    }

    // Local countdown interpolation between server updates
    const interval = setInterval(() => {
      if (hasReceivedValidCountdown.current) {
        const elapsed = Math.floor((Date.now() - lastUpdateTime.current) / 1000);
        const remaining = Math.max(0, lastServerSeconds.current - elapsed);
        setDisplaySeconds(remaining);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [secondsRemaining, participantCount]);

  const timeLeft = {
    minutes: Math.floor(displaySeconds / 60),
    seconds: displaySeconds % 60
  };

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

  // Show "STARTING" animation ONLY when countdown has legitimately counted down to 0
  // (not when server briefly sends 0 before setting the countdown)
  if (displaySeconds === 0 && status === ROUND_STATUS.OPEN && hasReceivedValidCountdown.current) {
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
          Starting...
        </div>
      </div>
    );
  }

  return (
    <div className="text-6xl md:text-8xl font-black font-mono text-white tracking-[0.4em] italic drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tabular-nums" data-testid="countdown-timer">
      {formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
    </div>
  );
}
