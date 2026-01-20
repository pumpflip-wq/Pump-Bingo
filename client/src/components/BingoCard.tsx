import { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BingoCardProps {
  card: number[][]; // 5x5 grid
  drawnNumbers: number[];
  className?: string;
}

export function BingoCard({ card, drawnNumbers, className }: BingoCardProps) {
  // Flatten card for easier rendering if needed, but grid is better
  // 5x5 grid
  
  // Memoize the check for matched numbers
  const isMatched = (num: number) => drawnNumbers.includes(num);

  return (
    <div className={cn("grid grid-cols-5 gap-2 p-4 bg-card rounded-xl border-2 border-white/10 shadow-2xl relative overflow-hidden", className)}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-transparent pointer-events-none" />
      
      {card.map((row, rowIndex) => (
        row.map((num, colIndex) => {
          const matched = isMatched(num);
          const isFreeSpace = num === 0; 
          
          return (
            <motion.div
              key={`${rowIndex}-${colIndex}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (rowIndex * 5 + colIndex) * 0.02 }}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg font-display text-lg md:text-xl font-bold relative border-2 transition-all duration-300",
                matched || isFreeSpace
                  ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(57,255,20,0.5)] scale-105 z-10" 
                  : "bg-black/40 text-muted-foreground border-white/10 hover:border-primary/50"
              )}
            >
              {isFreeSpace ? (
                <span className="text-xs md:text-sm font-black tracking-tighter">PUMP</span>
              ) : (
                num
              )}
              
              {/* Shine effect on match */}
              {(matched || isFreeSpace) && (
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-lg" />
              )}
            </motion.div>
          );
        })
      ))}
    </div>
  );
}
