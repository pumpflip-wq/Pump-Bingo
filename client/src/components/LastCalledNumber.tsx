import { motion, AnimatePresence } from "framer-motion";

interface LastCalledNumberProps {
  numbers: number[];
}

export function LastCalledNumber({ numbers }: LastCalledNumberProps) {
  const lastNumber = numbers.length > 0 ? numbers[numbers.length - 1] : null;

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-display">Last Called</span>
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer rotating ring */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
        />
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-2 rounded-full bg-black border border-primary/50 shadow-[0_0_30px_rgba(57,255,20,0.2)]" />
        
        <AnimatePresence mode="popLayout">
          {lastNumber !== null ? (
            <motion.div
              key={lastNumber}
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="z-10 text-4xl font-display font-bold text-primary"
            >
              {lastNumber}
            </motion.div>
          ) : (
            <span className="z-10 text-2xl font-display font-bold text-muted-foreground">--</span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
