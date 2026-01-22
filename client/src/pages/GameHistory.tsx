
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, History, ShieldCheck, ChevronLeft, ChevronRight, ExternalLink, Copy, Search } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { PROTOCOL_CONFIG } from "@shared/config";
import { format } from "date-fns";
import { Link } from "wouter";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useToast } from "@/hooks/use-toast";

export default function GameHistory() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { toast } = useToast();

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
    <div className="flex flex-col bg-background text-foreground">
      <div className="w-full flex-1 flex flex-col space-y-4 max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none flex items-center justify-center gap-4">
              <History className="w-10 h-10 text-primary" />
              GAME <span className="text-primary">HISTORY</span>
            </h1>
            <p className="text-white uppercase font-black tracking-widest text-sm max-w-2xl mx-auto drop-shadow-sm">
              Full record of all completed bingo rounds. Transparent and verifiable.
            </p>
          </div>

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
                  <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow>
                          <TableHead className="font-black uppercase tracking-widest text-white/60 text-sm">Round</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white/60 text-sm">Winner</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white/60 text-sm">Prize Pool</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white/60 text-sm">Verification Info</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white/60 text-sm">Date</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-white/60 text-sm">Verify</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.rounds.map((round) => (
                          <TableRow key={round.id} className="hover:bg-white/5 transition-colors border-white/5">
                            <TableCell className="font-mono font-bold text-primary text-base">#{round.id}</TableCell>
                            <TableCell className="font-bold italic text-base">
                              {round.winnerUsername ? (
                                <span className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-primary" />
                                  {formatAddress(round.winnerUsername)}
                                </span>
                              ) : "No Winner"}
                            </TableCell>
                            <TableCell className="font-black text-primary text-lg">
                              {round.prizePool.toLocaleString()} {PROTOCOL_CONFIG.SYMBOL}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 min-w-[240px]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/40 uppercase font-bold">Hash:</span>
                                  <span className="text-xs font-mono text-white truncate max-w-[150px]">{round.publicHash}</span>
                                  <Copy className="w-4 h-4 text-white/20 cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                    navigator.clipboard.writeText(round.publicHash);
                                    toast({ title: "Hash Copied" });
                                  }} />
                                </div>
                                {round.serverSeed && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-primary/40 uppercase font-bold">Seed:</span>
                                    <span className="text-xs font-mono text-primary truncate max-w-[150px]">{round.serverSeed}</span>
                                    <Copy className="w-4 h-4 text-primary/20 cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                      navigator.clipboard.writeText(round.serverSeed);
                                      toast({ title: "Seed Copied" });
                                    }} />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-white/60 text-base whitespace-nowrap">
                              {round.completedAt ? format(new Date(round.completedAt), "MMM d, HH:mm") : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Link href={`/verify?roundId=${round.id}`}>
                                  <Button variant="ghost" size="sm" className="hover:text-primary transition-colors flex items-center gap-2 px-3">
                                    <Search className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Verify</span>
                                  </Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="hover:text-primary transition-colors" asChild>
                                  <a href={`https://explorer.solana.com/address/${PROTOCOL_CONFIG.MINT_ADDRESS}?cluster=${PROTOCOL_CONFIG.NETWORK}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              </div>
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
    </div>
  );
}
