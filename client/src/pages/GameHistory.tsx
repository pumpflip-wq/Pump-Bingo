
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Trophy, History, ShieldCheck, ChevronLeft, ChevronRight, ExternalLink, Copy, Search, Users, Hash } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROTOCOL_CONFIG } from "@shared/config";
import { format } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useRound } from "@/hooks/use-game";

function RoundDetailsModal({ roundId }: { roundId: number }) {
  const { data: details, isLoading } = useRound(roundId);

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;
  if (!details) return null;

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Participants</span>
          </div>
          <p className="text-3xl font-black italic text-white">{details.participantsCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-5 h-5 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Drawn Count</span>
          </div>
          <p className="text-3xl font-black italic text-white">{details.round.drawnNumbers?.length || 0}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary italic">Draw Sequence</h3>
        <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-black/40 border border-white/5 max-h-[160px] overflow-y-auto custom-scrollbar">
          {details.round.drawnNumbers?.map((num: number, i: number) => (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              key={i}
              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
            >
              {num}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary italic">Winners & Participants</h3>
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
          {details.participants.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-black text-white">{p.username.slice(0, 6)}...{p.username.slice(-4)}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-[10px] text-white font-black uppercase tracking-widest opacity-60">Joined {format(new Date(p.joinedAt), "HH:mm:ss")}</p>
                    {p.winRate !== null && p.winRate !== undefined && (
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Final Chance: {p.winRate}%</span>
                    )}
                  </div>
                </div>
              </div>
              {details.round.winnerId === p.id && (
                <div className="px-3 py-1.5 rounded bg-primary/20 border border-primary/20 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase text-primary">Winner</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameHistory() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ rounds: any[], total: number }>({
    queryKey: ["/api/rounds/history", page],
    queryFn: async () => {
      const res = await fetch(`/api/rounds/history?page=${page}&limit=${limit}`);
      if (!res.ok) return { rounds: [], total: 0 };
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
                          <TableHead className="font-black uppercase tracking-widest text-white text-sm">Round</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white text-sm">Winner</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white text-sm">Prize Pool</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white text-sm">Verification Info</TableHead>
                          <TableHead className="font-black uppercase tracking-widest text-white text-sm">Date</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-white text-sm">Verify</TableHead>
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
                              {formatCurrency(round.prizePool || 0)} {PROTOCOL_CONFIG.SYMBOL}
                            </TableCell>
                            <TableCell>
                  <div className="flex flex-col gap-1 min-w-[240px]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white uppercase font-black">Hash:</span>
                                  <span className="text-xs font-mono text-white font-black truncate max-w-[150px]">{round.publicHash}</span>
                                  <Copy className="w-4 h-4 text-white cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                    navigator.clipboard.writeText(round.publicHash);
                                    toast({ title: "Hash Copied" });
                                  }} />
                                </div>
                                {round.serverSeed && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-primary uppercase font-black">Seed:</span>
                                    <span className="text-xs font-mono text-primary font-black truncate max-w-[150px]">{round.serverSeed}</span>
                                    <Copy className="w-4 h-4 text-primary cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                      navigator.clipboard.writeText(round.serverSeed);
                                      toast({ title: "Seed Copied" });
                                    }} />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-white text-base whitespace-nowrap font-bold">
                              {round.completedAt ? format(new Date(round.completedAt), "MMM d, HH:mm:ss") : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="default" className="hover:text-primary transition-colors flex items-center gap-2 px-4">
                                      <Search className="w-5 h-5" />
                                      <span className="text-xs font-black uppercase tracking-widest">Details</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="glass-card neon-border border-primary/20 bg-black/95 text-white max-w-2xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-[2rem] mt-12">
                                    <DialogHeader className="p-6 pb-2 shrink-0">
                                      <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                                        <History className="w-8 h-8 text-primary" />
                                        Round <span className="text-primary">#{round.id}</span>
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                                      <RoundDetailsModal roundId={round.id} />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Link href={`/verify?roundId=${round.id}`}>
                                  <Button variant="ghost" size="default" className="hover:text-primary transition-colors flex items-center gap-2 px-4">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">Verify</span>
                                  </Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="h-10 w-10 hover:text-primary transition-colors" asChild>
                                  <a href={`https://explorer.solana.com/tx/${round.payoutSignature || ''}?cluster=${PROTOCOL_CONFIG.NETWORK}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-5 h-5" />
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
                    <p className="text-sm text-white font-mono uppercase font-bold tracking-widest">
                      Showing {data?.rounds.length} of {data?.total} rounds
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="border-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px]"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <Button
                            key={i}
                            variant={page === i + 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(i + 1)}
                            className={page === i + 1 ? "bg-primary text-black font-black" : "border-white/10 hover:bg-white/20 text-white font-black"}
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
                        className="border-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px]"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
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
