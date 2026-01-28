import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CyberButton } from './ui/CyberButton';
import { Trophy, ExternalLink, Frown } from 'lucide-react';
import { formatAddress, formatCurrency } from "@/lib/utils";
import { PROTOCOL_CONFIG } from "@shared/config";

interface WinnerOverlayProps {
  show: boolean;
  username: string;
  prize: number;
  isWinner: boolean;
  isParticipant?: boolean;
  timeLeft: number;
  txHash: string;
  onClose: () => void;
}

export function WinnerOverlay({ show, username, prize, isWinner, isParticipant, timeLeft, txHash, onClose }: WinnerOverlayProps) {
  useEffect(() => {
    if (show && isWinner) {
      confetti({
        particleCount: 200,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#39FF14', '#ffffff', '#9945FF']
      });
    }
  }, [show, isWinner]);

  const explorerUrl = txHash ? `https://solscan.io/tx/${txHash}?cluster=${PROTOCOL_CONFIG.NETWORK}` : null;

  // Header and Subtitle logic based on being a winner, loser, or spectator
  let headerText = 'GAME OVER';
  let subtitleText = "DON'T GIVE UP! LUCK IS JUST AROUND THE CORNER";
  let descriptionText = "Better luck next time! Keep playing to win big.";

  if (isWinner) {
    headerText = 'BINGO! YOU WIN!';
    subtitleText = 'CONGRATULATIONS CHAMPION';
  } else if (isParticipant) {
    headerText = 'GAME OVER';
    subtitleText = "DON'T GIVE UP! LUCK IS JUST AROUND THE CORNER";
    descriptionText = "Better luck next time! Keep playing to win big.";
  } else {
    headerText = 'ROUND ENDED';
    subtitleText = 'SPECTATOR MODE';
    descriptionText = "The round has concluded. Join the next one to win!";
  }

  // Ensure background elements are visible
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 40, rotate: -2 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, y: 40, rotate: 2 }}
            className={`w-full max-w-md bg-card border-4 ${isWinner ? 'border-primary shadow-[0_0_100px_rgba(57,255,20,0.3)]' : 'border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.2)]'} rounded-[3rem] p-6 text-center relative overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 w-full h-2 ${isWinner ? 'bg-primary' : 'bg-red-500'} animate-pulse`} />
            
            <div className="mb-2 relative inline-block">
              <div 
                className="w-48 h-48 rounded-none overflow-visible flex items-center justify-center"
              >
                {!isWinner && (
                  <img 
                    src="https://i.ibb.co/xKdrTKBt/20260122-2231-Image-Generation-remix-01kfkpbpksfy4bxdzhr8rc39q7.png" 
                    alt="Game Over" 
                    className="w-full h-full object-contain scale-125"
                  />
                )}
                {isWinner && (
                  <img 
                    src="https://i.ibb.co/F4JdGb1q/20260122-1554-Image-Generation-remix-01kfjzkjq3ebzbpy2j9dhghe0s.png" 
                    alt="Victory" 
                    className="w-full h-full object-contain scale-125"
                  />
                )}
              </div>
            </div>

            <h2 className={`text-6xl font-display font-black mb-4 tracking-tighter uppercase italic ${isWinner ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : (isParticipant ? 'text-red-500' : 'text-primary')}`}>
              {headerText}
            </h2>
            
            <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-6">
              {subtitleText}
            </p>

            <div className="bg-black/40 rounded-3xl p-6 mb-6 border border-white/10 text-center relative overflow-hidden">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] text-white uppercase font-black tracking-widest mb-1 text-center">WINNER ADDRESS</p>
                  <p className="text-xl font-bold text-white italic truncate text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {formatAddress(username)}
                </p>
                </div>
                <div>
                  <p className="text-[10px] text-white uppercase font-black tracking-widest mb-1 text-center">TOTAL REWARD</p>
                  <div className="flex flex-col items-center gap-0">
                    <p className="text-5xl font-black text-primary italic leading-none drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]">
                      {formatCurrency(prize, false)}
                    </p>
                    <span className="text-[10px] font-black text-primary italic uppercase tracking-[0.3em] mt-2">{PROTOCOL_CONFIG.SYMBOL}</span>
                  </div>
                </div>
                {isWinner && explorerUrl && (
                  <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-xs text-primary hover:text-white transition-colors font-black uppercase tracking-widest pt-4 border-t border-white/10">
                    <ExternalLink className="w-4 h-4" /> VERIFY ON-CHAIN
                  </a>
                )}
                {!isWinner && (
                   <p className="text-sm font-bold text-white italic tracking-tight pt-4 border-t border-white/10">
                    {descriptionText}
                  </p>
                )}
              </div>
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
