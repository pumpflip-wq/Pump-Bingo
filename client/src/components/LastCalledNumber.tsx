import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface LastCalledNumberProps {
  numbers: number[];
}

export function LastCalledNumber({ numbers }: LastCalledNumberProps) {
  const lastNumber = numbers.length > 0 ? numbers[numbers.length - 1] : null;

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Fixed Frame Elements */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-primary/20"
        />
        <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-xl border border-primary/30 shadow-[0_0_30px_rgba(57,255,20,0.1)]" />
        
        {/* Fixed Active Badge */}
        <div className="absolute -bottom-2 z-20 px-3 py-0.5 rounded-full bg-primary text-black text-[9px] font-black uppercase tracking-tighter italic shadow-[0_0_10px_rgba(57,255,20,0.5)]">
          ACTIVE
        </div>

        <AnimatePresence mode="popLayout">
          {lastNumber !== null ? (
            <motion.div
              key={lastNumber}
              initial={{ scale: 0.5, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="z-10"
            >
              <div className="text-5xl font-black font-display text-primary italic leading-none drop-shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                {lastNumber}
              </div>
            </motion.div>
          ) : (
            <div className="z-10 flex flex-col items-center space-y-1 opacity-20">
              <Zap className="w-6 h-6 text-primary" />
              <span className="text-[8px] font-black text-primary uppercase tracking-widest italic">Syncing</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* History indicator - More compact */}
      {numbers.length > 1 && (
        <div className="flex gap-1.5 opacity-60">
           {numbers.slice(-6, -1).reverse().map((n, i) => (
             <div key={i} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white italic">
               {n}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
