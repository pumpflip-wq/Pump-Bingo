import { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BingoCardProps {
  card: number[][]; // 5x5 grid
  drawnNumbers: number[];
  className?: string;
}

export function BingoCard({ card, drawnNumbers, className }: BingoCardProps) {
  // Memoize the check for matched numbers
  const isMatched = (num: number) => drawnNumbers.includes(num);

  return (
    <div className={cn("grid grid-cols-5 gap-3 p-6 bg-black/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group", className)}>
      {/* Dynamic background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {card?.map((row, rowIndex) => (
        row?.map((num, colIndex) => {
          const matched = isMatched(num);
          const isFreeSpace = num === 0; 
          
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                "aspect-square flex items-center justify-center rounded-2xl font-display relative transition-all duration-500 overflow-hidden",
                matched || isFreeSpace
                  ? "bg-primary text-black shadow-[0_0_25px_rgba(57,255,20,0.4)] scale-105 z-10 font-black italic" 
                  : "bg-white/[0.03] text-white/30 border border-white/5 font-bold hover:bg-white/[0.08] hover:text-white/60"
              )}
            >
              {isFreeSpace ? (
                <div className="w-full h-full p-1">
                  <img 
                    src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                    alt="LOGO" 
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
              ) : (
                <span className={cn(
                  "text-2xl md:text-3xl tracking-tighter",
                  matched ? "animate-pulse" : ""
                )}>
                  {num}
                </span>
              )}
              
              {/* Inner glow effect for matched numbers */}
              {(matched || isFreeSpace) && (
                <div className="absolute inset-0 rounded-2xl border-2 border-white/30 mix-blend-overlay animate-pulse" />
              )}
              
              {/* Corner accent */}
              <div className={cn(
                "absolute top-1 left-1 w-1.5 h-1.5 border-t border-l rounded-tl-sm transition-colors",
                (matched || isFreeSpace) ? "border-black/40" : "border-white/10"
              )} />
            </div>
          );
        })
      ))}
    </div>
  );
}
