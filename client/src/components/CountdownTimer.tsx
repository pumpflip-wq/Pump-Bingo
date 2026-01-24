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
  const [displaySeconds, setDisplaySeconds] = useState(secondsRemaining);
  const lastUpdateTime = useRef(Date.now());
  const lastServerSeconds = useRef(secondsRemaining);

  useEffect(() => {
    // If waiting for players, show --:--
    if (participantCount < 2) {
      setDisplaySeconds(60);
      lastServerSeconds.current = 60;
      lastUpdateTime.current = Date.now();
      return;
    }

    // Force an immediate update if the server sends 60 and we haven't started yet
    // This prevents the 00:00 flash while waiting for the server tick
    if (secondsRemaining > 0 && (lastServerSeconds.current === 0 || lastServerSeconds.current === 60)) {
      setDisplaySeconds(secondsRemaining);
      lastServerSeconds.current = secondsRemaining;
      lastUpdateTime.current = Date.now();
    }

    // Synchronize with server data when it changes
    // We update lastServerSeconds even if it's within 1 second to keep the ref accurate
    if (secondsRemaining !== lastServerSeconds.current) {
      // If we jump from 0 to 60 or vice-versa significantly, reset the anchor
      if (Math.abs(secondsRemaining - lastServerSeconds.current) > 2) {
        setDisplaySeconds(secondsRemaining);
      } else if (secondsRemaining > displaySeconds) {
        // If server says we have more time than we display, catch up
        setDisplaySeconds(secondsRemaining);
      }
      lastServerSeconds.current = secondsRemaining;
      lastUpdateTime.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastUpdateTime.current) / 1000);
      const nextSeconds = Math.max(0, lastServerSeconds.current - elapsed);
      if (nextSeconds !== displaySeconds) {
        setDisplaySeconds(nextSeconds);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [secondsRemaining, participantCount, displaySeconds]);

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

  return (
    <div className="text-6xl md:text-8xl font-black font-mono text-white tracking-[0.4em] italic drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tabular-nums" data-testid="countdown-timer">
      {formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
    </div>
  );
}
