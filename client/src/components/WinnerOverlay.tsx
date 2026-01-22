import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CyberButton } from './ui/CyberButton';
import { Trophy, ExternalLink, Frown } from 'lucide-react';
import { PROTOCOL_CONFIG } from '@shared/config';

interface WinnerOverlayProps {
  show: boolean;
  username: string;
  prize: number;
  isWinner: boolean;
  txHash?: string;
  onClose: () => void;
}

export function WinnerOverlay({ show, username, prize, isWinner, txHash, onClose }: WinnerOverlayProps) {
  const [timeLeft, setLeft] = useState(5);

  useEffect(() => {
    if (show) {
      setLeft(5);
      if (isWinner) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#39FF14', '#ffffff']
        });
      }

      const timer = setInterval(() => {
        setLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [show, isWinner, onClose]);

  const explorerUrl = txHash ? `https://explorer.solana.com/tx/${txHash}?cluster=${PROTOCOL_CONFIG.NETWORK}` : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`w-full max-w-md bg-card border-2 ${isWinner ? 'border-primary shadow-[0_0_50px_rgba(57,255,20,0.2)]' : 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.1)]'} rounded-[2.5rem] p-8 text-center relative overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 w-full h-1 ${isWinner ? 'bg-primary' : 'bg-red-500'} opacity-50`} />
            
            <div className="mb-6 relative inline-block">
              <motion.div 
                animate={isWinner ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : { y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isWinner ? 'bg-primary/20 border-primary/50' : 'bg-red-500/10 border-red-500/30'} border-2`}
              >
                {isWinner ? <Trophy className="w-10 h-10 text-primary" /> : <Frown className="w-10 h-10 text-red-500" />}
              </motion.div>
            </div>

            <h2 className={`text-5xl font-display font-black mb-2 tracking-tighter uppercase italic ${isWinner ? 'text-white' : 'text-red-500'}`}>
              {isWinner ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            
            <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] mb-8">
              {isWinner ? 'Protocol Master Detected' : 'Sequence Terminated'}
            </p>

            <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10 text-left relative">
              {isWinner ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Champion</p>
                      <p className="text-xl font-bold text-white italic">@{username}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Prize Harvested</p>
                      <p className="text-4xl font-black text-primary italic">
                        {prize.toLocaleString()} <span className="text-xs font-black opacity-50">PUMP</span>
                      </p>
                    </div>
                    {explorerUrl && (
                      <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] text-primary hover:underline font-black uppercase tracking-widest pt-2 border-t border-white/5">
                        <ExternalLink className="w-3 h-3" /> Proof of Payout
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1 text-left">Winner</p>
                  <p className="text-sm font-bold text-white italic text-left mb-4">@{username} claimed the prize</p>
                  <div className="h-[1px] w-full bg-white/5 mb-4" />
                  <p className="text-sm text-white/60 font-medium italic">
                    The nodes didn't align in your favor this time. 
                  </p>
                  <p className="text-primary text-xs font-black uppercase tracking-widest animate-pulse">
                    Next protocol starting soon...
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <CyberButton onClick={onClose} variant={isWinner ? "primary" : "outline"} className="w-full h-14">
                LOBBY ({timeLeft}s)
              </CyberButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
