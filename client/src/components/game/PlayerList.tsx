import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ShieldCheck, Globe } from "lucide-react";
import { cn, formatAddress, formatCurrency } from "@/lib/utils";
import { PROTOCOL_CONFIG } from "@shared/config";

interface PlayerListProps {
  participants: any[];
  walletAddress?: string;
  formatAddress: (address: string) => string;
  roundStatus: string;
  roundData?: any;
}

export function PlayerList({ participants, walletAddress, formatAddress, roundStatus, roundData }: PlayerListProps) {
  const amIParticipating = useMemo(() => participants.some(participant => participant.username === walletAddress), [participants, walletAddress]);

  const sortedParticipants = useMemo(() => {
    if (!amIParticipating || (roundStatus !== 'IN_GAME' && roundStatus !== 'FINISHED')) {
      return participants;
    }
    return [...participants].sort((a, b) => (b.prob || 0) - (a.prob || 0));
  }, [participants, amIParticipating, roundStatus]);

  return (
    <div className="glass-card neon-border rounded-2xl p-6 flex flex-col h-[750px] overflow-hidden bg-black/20">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h3 className="text-[22px] text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
          <Users className="w-6 h-6 text-primary" /> Active Players
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {sortedParticipants.map((p: any, idx) => {
            const isMe = p.username === walletAddress;
            const isWinner = roundData?.round.winnerId === p.id || roundData?.round.winnerId === p.userId;
            const showStats = (roundStatus === 'IN_GAME' || roundStatus === 'FINISHED') && amIParticipating;
            
            return (
              <motion.div 
                layout
                key={p.id || p.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1
                }}
                className={cn(
                  "flex items-center justify-between p-3 bg-white/5 rounded-xl border transition-all hover:border-primary/50 hover:bg-white/10 group",
                  isMe ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-white/5"
                )}
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {showStats && (
                        <span className="text-sm font-black text-primary font-mono shrink-0 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                          {idx + 1}
                        </span>
                      )}
                      <span className="text-sm font-black text-white italic tracking-tight flex items-center gap-1 truncate">
                        {formatAddress(p.username)}
                        {isMe && <span className="text-[10px] text-primary font-black ml-1">(YOU)</span>}
                      </span>
                    </div>
                    {showStats && (
                      <span className="text-sm font-black text-primary min-w-[3ch] text-right">
                        {Math.round(p.prob || 0)}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[12px] text-primary font-black font-mono tracking-normal">
                      -{(Number(roundData?.round?.price || PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) / 1e9).toFixed(2)} SOL
                    </span>
                    {showStats && (roundStatus === 'IN_GAME' || roundStatus === 'FINISHED') && (
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${p.prob || 0}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <ShieldCheck className={cn(
                  "w-4 h-4 transition-colors shrink-0 ml-2",
                  isMe ? "text-primary" : "text-primary/40 group-hover:text-primary"
                )} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {participants.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-3">
            <Globe className="w-10 h-10 text-white" />
            <p className="text-sm uppercase font-black tracking-widest text-white">Waiting for players...</p>
          </div>
        )}
      </div>
    </div>
  );
}
