import { motion, AnimatePresence } from "framer-motion";
import { Users, ShieldCheck, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTOCOL_CONFIG } from "@shared/config";

interface PlayerListProps {
  participants: any[];
  walletAddress?: string;
  formatAddress: (address: string) => string;
  roundStatus: string;
}

export function PlayerList({ participants, walletAddress, formatAddress, roundStatus }: PlayerListProps) {
  return (
    <div className="glass-card neon-border rounded-2xl p-6 flex flex-col flex-1 overflow-hidden min-h-0 bg-black/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
          <Users className="w-4 h-4 text-primary" /> Active Players
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {participants.map((p: any) => {
            const isMe = p.username === walletAddress;
            return (
              <motion.div 
                key={p.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center justify-between p-3 bg-white/5 rounded-xl border transition-all hover:border-primary/50 hover:bg-white/10 group",
                  isMe ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-white/5"
                )}
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-black text-white italic tracking-tight flex items-center gap-1">
                      @{formatAddress(p.username)}
                      {isMe && <span className="text-[10px] text-primary font-black ml-1">(YOU)</span>}
                    </span>
                    <span className="text-sm font-black text-primary">
                      {roundStatus === 'IN_GAME' ? `${Math.round(p.prob)}%` : "0%"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-primary font-black font-mono">+{PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} {PROTOCOL_CONFIG.SYMBOL}</span>
                    {roundStatus === 'IN_GAME' && (
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${p.prob}%` }}
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
