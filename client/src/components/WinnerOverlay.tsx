import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CyberButton } from './ui/CyberButton';
import { Trophy } from 'lucide-react';

interface WinnerOverlayProps {
  show: boolean;
  username: string;
  prize: number;
  onClose: () => void;
}

export function WinnerOverlay({ show, username, prize, onClose }: WinnerOverlayProps) {
  useEffect(() => {
    if (show) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#39FF14', '#9D00FF', '#ffffff']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#39FF14', '#9D00FF', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 100 }}
            className="w-full max-w-md bg-card border-2 border-primary rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(57,255,20,0.3)] relative overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.15),transparent)] pointer-events-none" />
            
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6 border-2 border-primary"
            >
              <Trophy className="w-12 h-12 text-primary" />
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-2 tracking-tighter uppercase">
              BINGO!
            </h2>
            
            <p className="text-muted-foreground font-display mb-8">
              Round Winner
            </p>
            
            <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider">Winning Player</p>
              <p className="text-2xl font-bold text-white mb-4">@{username}</p>
              
              <div className="h-[1px] w-full bg-white/10 mb-4" />
              
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider">Prize Won</p>
              <p className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                {prize.toLocaleString()} PUMP
              </p>
            </div>
            
            <CyberButton onClick={onClose} variant="primary" className="w-full">
              Back to Lobby
            </CyberButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
