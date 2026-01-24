import { useQuery } from "@tanstack/react-query";
import { type Transaction, type Round } from "@shared/schema";
import { formatCurrency, formatAddress } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { data: rounds, isLoading: roundsLoading } = useQuery<(Round & { winnerUsername?: string })[]>({
    queryKey: ["/api/rounds/history"],
  });

  const { data: stats } = useQuery<{ totalPrize: number; totalPlayers: number }>({
    queryKey: ["/api/admin/stats"],
  });

  if (roundsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-primary" />
          Protocol Admin
        </h1>
        <div className="flex gap-4">
          <Card className="bg-black/40 border-primary/20 min-w-[200px]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-white/50 uppercase font-black">Total Payouts</span>
              </div>
              <p className="text-2xl font-black text-primary mt-2 italic">
                {formatCurrency(stats?.totalPrize || 0)} {PROTOCOL_CONFIG.SYMBOL}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-primary/20 min-w-[200px]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-white/50 uppercase font-black">Total Players</span>
              </div>
              <p className="text-2xl font-black text-white mt-2 italic">{stats?.totalPlayers || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-black/40 border-white/5">
        <CardHeader>
          <CardTitle className="text-white uppercase font-black tracking-widest text-sm">Automated Prize Distribution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rounds?.map((round) => (
              <div key={round.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-white/40 font-black">ROUND</p>
                    <p className="text-xl font-black text-white">#{round.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Winner</p>
                    <p className="text-sm font-mono text-primary font-bold">{round.winnerUsername ? formatAddress(round.winnerUsername) : 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Amount Disbursed</p>
                  <p className="text-lg font-black text-primary italic">+{formatCurrency(round.prizePool || 0)} {PROTOCOL_CONFIG.SYMBOL}</p>
                  <p className="text-[10px] text-white/30">{round.completedAt ? format(new Date(round.completedAt), "PPp") : "Pending"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
