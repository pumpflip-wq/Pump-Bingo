import { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BingoCell } from "./game/BingoCell";

interface BingoCardProps {
  card: number[][]; // 5x5 grid
  drawnNumbers: number[];
  className?: string;
}

export function BingoCard({ card, drawnNumbers, className }: BingoCardProps) {
  // Memoize the check for matched numbers
  const isMatched = (num: number) => drawnNumbers.includes(num);

  const isNearWin = useMemo(() => {
    const drawnSet = new Set(drawnNumbers);
    let minMissing = 5;

    // Rows
    for (let r = 0; r < 5; r++) {
      if (!card[r]) continue;
      const missing = card[r].filter(n => n !== 0 && !drawnSet.has(n)).length;
      minMissing = Math.min(minMissing, missing);
    }
    // Cols
    for (let c = 0; c < 5; c++) {
      let missing = 0;
      for (let r = 0; r < 5; r++) {
        if (!card[r]) continue;
        const n = card[r][c];
        if (n !== 0 && !drawnSet.has(n)) missing++;
      }
      minMissing = Math.min(minMissing, missing);
    }
    // Diagonals
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 5; i++) {
      if (card[i] && card[i][i] !== 0 && !drawnSet.has(card[i][i])) d1++;
      if (card[i] && card[i][4-i] !== 0 && !drawnSet.has(card[i][4-i])) d2++;
    }
    minMissing = Math.min(minMissing, d1, d2);
    return minMissing === 1;
  }, [card, drawnNumbers]);

  return (
    <div className={cn(
      "grid grid-cols-5 gap-1 lg:gap-3 p-1.5 lg:p-6 bg-black/60 backdrop-blur-2xl rounded-xl lg:rounded-2xl border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all duration-500",
      isNearWin ? "border-primary shadow-[0_0_30px_rgba(57,255,20,0.3)] scale-[1.01]" : "border-white/5",
      className
    )}>
      {/* Dynamic background effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none",
        isNearWin && "opacity-80 from-primary/20"
      )} />
      <div className={cn(
        "absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent",
        isNearWin && "via-primary/60"
      )} />
      
      {isNearWin && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-primary/5 pointer-events-none"
        />
      )}
      {card?.map((row, rowIndex) => (
        row?.map((num, colIndex) => (
          <BingoCell 
            key={`${rowIndex}-${colIndex}`}
            num={num}
            matched={isMatched(num)}
            isFreeSpace={num === 0}
            rowIndex={rowIndex}
            colIndex={colIndex}
          />
        ))
      ))}
    </div>
  );
}
