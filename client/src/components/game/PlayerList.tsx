import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ShieldCheck, Globe } from "lucide-react";
import { cn, formatAddress } from "@/lib/utils";
import { PROTOCOL_CONFIG } from "@shared/config";

interface PlayerListProps {
  participants: any[];
  walletAddress?: string;
  formatAddress: (address: string) => string;
  roundStatus: string;
  roundData?: any;
}

export function PlayerList({ participants, walletAddress, formatAddress, roundStatus, roundData }: PlayerListProps) {
  const amIParticipating = useMemo(() => participants.some(p => p.username === walletAddress), [participants, walletAddress]);

  const activeParticipants = useMemo(() => {
    if (!participants || participants.length === 0) return [];
    const map = new Map();
    // Prefer confirmed (with txSignature) over optimistic entries
    const list = [...participants].sort((a: any, b: any) =>
      (b.txSignature ? 1 : 0) - (a.txSignature ? 1 : 0)
    );
    list.forEach(p => {
      const key = p.userId != null ? String(p.userId) : p.username;
      if (!key || p.username === "Unknown") return;
      if (!map.has(key) || (!map.get(key).txSignature && p.txSignature)) {
        map.set(key, p);
      }
    });
    return Array.from(map.values());
  }, [participants]);

  const sortedParticipants = useMemo(() => {
    if (activeParticipants.length === 0) return [];
    const winnerKey = roundData?.round?.winnerUsername?.toLowerCase() || null;
    const normalized = activeParticipants.map(p => ({ ...p, _key: (p.username || "").toLowerCase() }));
    if (roundStatus === 'IN_GAME' || roundStatus === 'FINISHED') {
      return normalized.sort((a, b) => {
        if (winnerKey && a._key === winnerKey) return -1;
        if (winnerKey && b._key === winnerKey) return 1;
        return (b.prob || 0) - (a.prob || 0);
      });
    }
    return normalized;
  }, [activeParticipants, roundStatus, roundData?.round?.winnerUsername]);

  const isPaidRound = Number(roundData?.round?.price || 0) > 0;
  const entryLabel = isPaidRound
    ? `+${(Number(roundData?.round?.price) / 1e6).toLocaleString("en-US")} ${PROTOCOL_CONFIG.SYMBOL}`
    : "FREE PLAY";

  return (
    <div className="glass-card neon-border rounded-2xl p-4 lg:p-6 flex flex-col h-full lg:h-[750px] overflow-hidden bg-black/20">
      <div className="flex items-center justify-between mb-4 lg:mb-6 shrink-0">
        <h3 className="text-lg lg:text-[22px] text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
          <Users className="w-5 h-5 lg:w-6 lg:h-6 text-primary" /> Active Players
        </h3>
        {sortedParticipants.length > 0 && (
          <span className="text-xs font-black text-primary/60 uppercase tracking-widest">{sortedParticipants.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 lg:pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {sortedParticipants.map((p: any, idx) => {
            const isMe = p.username === walletAddress;
            if (!p.username || p.username === "Unknown") return null;
            const showStats = roundStatus === 'IN_GAME' || roundStatus === 'FINISHED';

            return (
              <motion.div
                layout
                key={p.userId || p.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "flex items-center justify-between p-3 bg-white/5 rounded-xl border transition-all hover:border-primary/50 hover:bg-white/10 group",
                  isMe ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-white/5"
                )}
              >
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {showStats && (
                        <span className="text-sm font-black text-primary font-mono shrink-0 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                          {idx + 1}
                        </span>
                      )}
                      <span className="text-sm font-black text-white italic tracking-tight truncate">
                        {formatAddress(p.username)}
                        {isMe && <span className="text-[10px] text-primary font-black ml-1">(YOU)</span>}
                      </span>
                    </div>
                    {showStats && (
                      <span className="text-sm font-black text-primary min-w-[3ch] text-right shrink-0">
                        {Math.round(p.prob || 0)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[11px] font-black font-mono tracking-normal",
                      isPaidRound ? "text-amber-400" : "text-primary/60"
                    )}>
                      {entryLabel}
                    </span>
                  </div>
                  {showStats && (
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.prob || 0}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  )}
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
