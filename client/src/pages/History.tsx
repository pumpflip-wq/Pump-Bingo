import { useQuery } from "@tanstack/react-query";
import { type Round } from "@shared/schema";
import { History, Trophy, ShieldCheck, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function HistoryPage() {
  const { data: historyRounds, isLoading } = useQuery<(Round & { winnerUsername: string | null })[]>({
    queryKey: ["/api/rounds/history"],
    refetchInterval: 10000
  });

  const formatAddress = (address: string) => {
    if (!address || address === "No Winner") return address;
    if (address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8">
        <header className="flex items-center justify-between">
          <Link href="/">
            <a className="text-primary hover:text-primary/80 font-black uppercase tracking-widest text-sm">← Back to Game</a>
          </Link>
          <h1 className="text-3xl font-black font-display italic">GAME <span className="text-primary">HISTORY</span></h1>
        </header>

        <div className="glass-card neon-border rounded-3xl p-8">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          ) : historyRounds?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyRounds.map((hr) => (
                <div key={hr.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Round ID</p>
                      <h4 className="text-xl font-black font-display text-white">#{hr.id}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Prize Pool</p>
                      <h4 className="text-xl font-black font-display text-primary">{hr.prizePool.toLocaleString()} PUMP</h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-white italic">@{formatAddress(hr.winnerUsername || "No Winner")}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      <span className="text-[8px] text-primary font-black uppercase tracking-widest">Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 opacity-30">
              <History className="w-12 h-12 mx-auto mb-4" />
              <p className="text-xs uppercase font-black tracking-widest text-white">No history recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
