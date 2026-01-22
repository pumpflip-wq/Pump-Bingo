
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, History, ShieldCheck, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { format } from "date-fns";

export default function GameHistory() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery<{ rounds: any[], total: number }>({
    queryKey: ["/api/rounds/history", page],
    queryFn: async () => {
      const res = await fetch(`/api/rounds/history?page=${page}&limit=${limit}`);
      return res.json();
    }
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const formatAddress = (addr: string) => {
    if (!addr || addr === "No Winner") return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black font-display italic tracking-tighter uppercase flex items-center gap-4">
              <History className="w-10 h-10 text-primary" />
              Game <span className="text-primary">History</span>
            </h1>
            <p className="text-white/40 font-mono text-sm tracking-widest uppercase">
              Full record of all completed bingo rounds
            </p>
          </div>
        </header>

        <Card className="glass-card neon-border bg-black/40 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-black italic tracking-widest uppercase flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> All Completed Rounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow>
                        <TableHead className="font-black uppercase tracking-widest text-white/60">Round</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-white/60">Winner</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-white/60">Prize Pool</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-white/60">Date</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-white/60">Status</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-white/60">Verify</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.rounds.map((round) => (
                        <TableRow key={round.id} className="hover:bg-white/5 transition-colors border-white/5">
                          <TableCell className="font-mono font-bold text-primary">#{round.id}</TableCell>
                          <TableCell className="font-bold italic">
                            {round.winnerUsername ? (
                              <span className="flex items-center gap-2">
                                <Trophy className="w-3 h-3 text-primary" />
                                {formatAddress(round.winnerUsername)}
                              </span>
                            ) : "No Winner"}
                          </TableCell>
                          <TableCell className="font-black text-primary">
                            {round.prizePool.toLocaleString()} {PROTOCOL_CONFIG.SYMBOL}
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {round.completedAt ? format(new Date(round.completedAt), "MMM d, HH:mm") : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-full w-fit">
                              <ShieldCheck className="w-3 h-3" /> Verified
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="hover:text-primary transition-colors" asChild>
                              <a href={`https://explorer.solana.com/address/${PROTOCOL_CONFIG.MINT_ADDRESS}?cluster=${PROTOCOL_CONFIG.NETWORK}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data?.rounds.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-20 opacity-30 uppercase font-black tracking-widest">
                            No games found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-white/40 font-mono">
                    Showing {data?.rounds.length} of {data?.total} rounds
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="border-white/10 hover:bg-white/10"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={page === i + 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(i + 1)}
                          className={page === i + 1 ? "" : "border-white/10 hover:bg-white/10"}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="border-white/10 hover:bg-white/10"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
