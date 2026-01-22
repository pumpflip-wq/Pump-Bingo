import { History, Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { PROTOCOL_CONFIG } from "@shared/config";

interface GameHistoryProps {
  historyRounds: any;
  historyLoading: boolean;
  formatAddress: (address: string) => string;
}

export function GameHistory({ historyRounds, historyLoading, formatAddress }: GameHistoryProps) {
  return (
    <div className="glass-card neon-border rounded-2xl p-6 flex flex-col flex-1 overflow-hidden bg-black/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
          <History className="w-4 h-4 text-primary" /> Game History
        </h3>
        <Link href="/history" className="text-[10px] font-black text-primary/60 hover:text-primary uppercase tracking-widest underline transition-colors">Full View</Link>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <div className="space-y-4">
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : historyRounds?.rounds?.length ? (
            historyRounds.rounds.slice(0, 5).map((hr: any) => (
              <HistoryItem 
                key={hr.id}
                id={hr.id} 
                winner={hr.winnerUsername || "No Winner"} 
                prize={hr.prizePool} 
                formatAddress={formatAddress}
                completedAt={hr.completedAt ? hr.completedAt.toString() : null}
              />
            ))
          ) : (
            <div className="text-center py-10 opacity-30">
              <p className="text-[10px] uppercase font-black tracking-widest text-white">No history yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ id, winner, prize, formatAddress, completedAt }: { id: number, winner: string, prize: number, formatAddress: (addr: string) => string, completedAt?: string | null }) {
  const explorerUrl = `https://explorer.solana.com/address/${PROTOCOL_CONFIG.MINT_ADDRESS}?cluster=${PROTOCOL_CONFIG.NETWORK}`;
  return (
    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:border-primary/50 hover:bg-white/10 group relative">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-black text-white tracking-tighter">ROUND #{id}</span>
          {completedAt && (
            <span className="text-[10px] text-white/40 font-bold mt-0.5">
              {format(new Date(completedAt), "MMM d, HH:mm:ss")}
            </span>
          )}
        </div>
        <span className="text-primary font-black font-display italic text-lg">+{prize.toLocaleString()} {PROTOCOL_CONFIG.SYMBOL}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-black text-white italic">@{formatAddress(winner)}</span>
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </a>
  );
}
