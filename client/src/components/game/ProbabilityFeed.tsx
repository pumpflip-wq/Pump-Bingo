import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProbabilityFeedProps {
  participants: any[];
  formatAddress: (address: string) => string;
  roundStatus?: string;
  winnerId?: number;
}

export function ProbabilityFeed({ participants, formatAddress, roundStatus, winnerId }: ProbabilityFeedProps) {
  return (
    <div className="space-y-4 min-h-[120px]">
      <AnimatePresence mode="popLayout">
        {participants.slice(0, 3).map((p: any, idx: number) => (
          <motion.div 
            key={p.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-primary font-black italic w-6">#{idx + 1}</span>
              <span className="text-sm font-bold text-white/80 italic flex items-center gap-2">
                {formatAddress(p.username)}
                {roundStatus === 'FINISHED' && p.userId === winnerId && (
                  <Trophy className="w-3 h-3 text-primary animate-bounce" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${p.prob}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-primary"
                />
              </div>
              <span className="text-[10px] font-black text-primary w-8 text-right">{Math.round(p.prob)}%</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
