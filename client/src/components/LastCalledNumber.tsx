import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface LastCalledNumberProps {
  numbers: number[];
}

export function LastCalledNumber({ numbers }: LastCalledNumberProps) {
  const lastNumber = numbers.length > 0 ? numbers[numbers.length - 1] : null;

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xl text-white uppercase font-black tracking-widest font-display">Recent Numbers</span>
      </div>

      <div className="relative w-28 h-28 flex items-center justify-center">
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
              <div className="text-5xl font-black font-display text-primary italic leading-none drop-shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                {lastNumber}
              </div>
            </motion.div>
          ) : (
            <div className="z-10 flex flex-col items-center space-y-1 opacity-20">
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Awaiting</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* History indicator */}
      {numbers.length > 1 && (
        <div className="flex gap-2">
           {numbers.slice(-5, -1).reverse().map((n, i) => (
             <div key={i} className="w-10 h-10 rounded-full bg-black/40 border-2 border-primary/30 flex items-center justify-center text-xs font-black text-primary italic shadow-lg">
               {n}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
