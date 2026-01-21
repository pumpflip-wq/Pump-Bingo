import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface LastCalledNumberProps {
  numbers: number[];
}

export function LastCalledNumber({ numbers }: LastCalledNumberProps) {
  const lastNumber = numbers.length > 0 ? numbers[numbers.length - 1] : null;

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white uppercase font-black tracking-widest font-display">Live Feed</span>
      </div>

      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Professional Gaming Ring Effects */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-primary/20"
        />
        
        {/* Glow and Pulse Base */}
        <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-xl border border-primary/30 shadow-[0_0_40px_rgba(57,255,20,0.15)] flex items-center justify-center">
          <div className="absolute inset-2 rounded-full border border-white/5 bg-gradient-to-br from-primary/5 to-transparent" />
        </div>
        
        <AnimatePresence mode="popLayout">
          {lastNumber !== null ? (
            <motion.div
              key={lastNumber}
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="z-10 flex flex-col items-center"
            >
              <div className="text-6xl font-black font-display text-primary italic leading-none drop-shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                {lastNumber}
              </div>
            </motion.div>
          ) : (
            <div className="z-10 flex items-center justify-center w-full h-full relative">
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative w-16 h-16"
              >
                {/* Visual balls spinning animation */}
                <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                <motion.div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/60 shadow-[0_0_10px_rgba(34,197,94,0.7)]" />
                <motion.div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/30 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-black text-primary uppercase tracking-widest animate-pulse">Waiting</span>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* History indicator */}
      {numbers.length > 1 && (
        <div className="flex gap-1.5">
           {numbers.slice(-6, -1).reverse().map((n, i) => (
             <div key={i} className="w-8 h-8 rounded-full bg-black/40 border border-primary/30 flex items-center justify-center text-[10px] font-black text-primary italic shadow-lg">
               {n}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
