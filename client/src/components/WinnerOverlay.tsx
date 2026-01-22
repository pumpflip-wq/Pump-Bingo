import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CyberButton } from './ui/CyberButton';
import { Trophy, ExternalLink, Frown } from 'lucide-react';
import { formatAddress } from "@/lib/utils";

interface WinnerOverlayProps {
  show: boolean;
  username: string;
  prize: number;
  isWinner: boolean;
  txHash?: string;
  onClose: () => void;
}

export function WinnerOverlay({ show, username, prize, isWinner, txHash, onClose }: WinnerOverlayProps) {
  const [timeLeft, setLeft] = useState(10);

  useEffect(() => {
    if (show) {
      setLeft(10);
      if (isWinner) {
        const timer = setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#39FF14', '#ffffff', '#9945FF']
          });
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [show, isWinner]);

  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, onClose]);

  const explorerUrl = txHash ? `https://explorer.solana.com/tx/${txHash}?cluster=${PROTOCOL_CONFIG.NETWORK}` : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 40, rotate: -2 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, y: 40, rotate: 2 }}
            className={`w-full max-w-lg bg-card border-4 ${isWinner ? 'border-primary shadow-[0_0_100px_rgba(57,255,20,0.3)]' : 'border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.2)]'} rounded-[3rem] p-10 text-center relative overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 w-full h-2 ${isWinner ? 'bg-primary' : 'bg-red-500'} animate-pulse`} />
            
            <div className="mb-8 relative inline-block">
              <motion.div 
                animate={isWinner ? { 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.2, 1, 1.2, 1] 
                } : { 
                  y: [0, 10, 0],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${isWinner ? 'bg-primary/20 border-primary' : 'bg-red-500/10 border-red-500'} border-4 shadow-2xl overflow-visible`}
              >
                {isWinner ? <Trophy className="w-12 h-12 text-primary" /> : <Frown className="w-12 h-12 text-red-500" />}
              </motion.div>
            </div>

            <h2 className={`text-6xl font-display font-black mb-4 tracking-tighter uppercase italic ${isWinner ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'text-red-500'}`}>
              {isWinner ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            
            <p className="text-white/60 font-black uppercase tracking-[0.3em] text-xs mb-10">
              {isWinner ? 'CONGRATULATIONS CHAMPION' : 'BETTER LUCK NEXT TIME'}
            </p>

            <div className="bg-black/40 rounded-3xl p-8 mb-10 border border-white/10 text-center relative overflow-hidden">
              {isWinner ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2 text-center">WINNER ADDRESS</p>
                    <p className="text-2xl font-bold text-white italic truncate text-center">@{formatAddress(username)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2 text-center">TOTAL REWARD</p>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-6xl font-black text-primary italic leading-none drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]">
                        {prize.toLocaleString()}
                      </p>
                      <span className="text-xs font-black text-primary/50 italic uppercase tracking-[0.3em]">PBINGO TOKEN</span>
                    </div>
                  </div>
                  {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-xs text-primary hover:text-white transition-colors font-black uppercase tracking-widest pt-4 border-t border-white/10">
                      <ExternalLink className="w-4 h-4" /> VERIFY ON-CHAIN
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-left">
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">ROUND WINNER</p>
                    <p className="text-lg font-bold text-white italic truncate">@{formatAddress(username)}</p>
                  </div>
                  <div className="h-[1px] w-full bg-white/10" />
                  <p className="text-base text-white/80 font-bold italic leading-relaxed">
                    The nodes were not in your favor. Re-synchronizing for next round...
                  </p>
                  <p className="text-primary text-sm font-black uppercase tracking-[0.2em] animate-pulse">
                    GET READY FOR THE NEXT DROP
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <CyberButton onClick={onClose} variant={isWinner ? "primary" : "outline"} className="w-full h-16 text-xl font-black italic tracking-tighter shadow-2xl">
                RETURN TO LOBBY ({timeLeft}s)
              </CyberButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
