import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BingoCellProps {
  num: number;
  matched: boolean;
  isFreeSpace: boolean;
  rowIndex: number;
  colIndex: number;
}

export function BingoCell({ num, matched, isFreeSpace, rowIndex, colIndex }: BingoCellProps) {
  return (
    <motion.div
      key={`${rowIndex}-${colIndex}`}
      initial={false}
      animate={matched ? { 
        scale: [1, 1.15, 1.05],
        rotate: [0, 2, -2, 0]
      } : { scale: 1 }}
      transition={{ duration: 0.5 }}
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
      
      {(matched || isFreeSpace) && (
        <div className="absolute inset-0 rounded-2xl border-2 border-white/30 mix-blend-overlay animate-pulse" />
      )}
      
      <div className={cn(
        "absolute top-1 left-1 w-1.5 h-1.5 border-t border-l rounded-tl-sm transition-colors",
        (matched || isFreeSpace) ? "border-black/40" : "border-white/10"
      )} />
    </motion.div>
  );
}
