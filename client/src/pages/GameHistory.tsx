
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Trophy, History, ShieldCheck, ChevronLeft, ChevronRight, ExternalLink, Copy, Search, Users, Hash } from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROTOCOL_CONFIG } from "@shared/config";
import { format } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
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
        <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-black/40 border border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar">
          {details.round.drawnNumbers?.map((num: number, i: number) => (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.01 }}
              key={i}
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary border border-primary/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]"
            >
              {num}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary italic">Winners & Participants</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {(() => {
            const winnerId = details.round.winnerId;
            
            const participants = (details.participants || [])
              .sort((a: any, b: any) => {
                const aIsWinner = winnerId && Number(a.userId) === Number(winnerId);
                const bIsWinner = winnerId && Number(b.userId) === Number(winnerId);
                if (aIsWinner) return -1;
                if (bIsWinner) return 1;
                return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
              });

            return participants.map((p: any, idx: number) => {
              const isWinner = winnerId && Number(p.userId) === Number(winnerId);
              return (
                <div 
                  key={`${roundId}-${p.userId || idx}`} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all relative overflow-hidden",
                    isWinner 
                      ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(34,197,94,0.3)] z-10" 
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm font-black uppercase tracking-tighter",
                          isWinner ? "text-primary drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "text-white"
                        )}>
                          {p.username ? p.username.length > 15 ? `${p.username.slice(0, 6)}...${p.username.slice(-4)}` : p.username : "Unknown"}
                        </p>
                        {isWinner && <Trophy className="w-4 h-4 text-primary animate-bounce" />}
                      </div>
                      <p className="text-[10px] text-white font-black uppercase tracking-widest opacity-60 mt-0.5">
                        {p.joinedAt ? format(new Date(p.joinedAt), "HH:mm:ss") : "--:--:--"}
                      </p>
                    </div>
                  </div>
                  {isWinner && (
                    <div className="px-5 py-2.5 rounded-xl bg-primary text-black flex items-center gap-2 shadow-[0_0_25px_rgba(34,197,94,0.6)] border border-white/30">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-tighter italic">WINNER</span>
                    </div>
                  )}
                </div>
              );
            });
          })()}
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

          <Card className="glass-card neon-border bg-black/40 border-primary/20 overflow-hidden">
            <CardHeader className="px-4 py-6 md:p-6">
              <CardTitle className="text-lg md:text-xl font-black italic tracking-widest uppercase flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> 
                <span className="md:hidden">Completed Rounds</span>
                <span className="hidden md:inline">All Completed Rounds</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-6 md:p-6">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
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
                              {formatCurrency(round.prizePool || 0, false)} {PROTOCOL_CONFIG.SYMBOL}
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
                                  <DialogContent className="glass-card neon-border border-primary/20 bg-black/95 text-white max-w-2xl w-[90vw] max-h-[80vh] overflow-hidden flex flex-col p-0 rounded-[2rem] mt-4">
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
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {data?.rounds.map((round) => (
                      <div key={round.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-primary text-xl">#{round.id}</span>
                          <span className="text-sm text-white font-bold opacity-80">
                            {round.completedAt ? format(new Date(round.completedAt), "MMM d, HH:mm") : "-"}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-white font-black uppercase tracking-widest opacity-90">Winner</p>
                            <div className="font-bold italic text-base flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-primary" />
                              <span className="text-white truncate max-w-[150px]">{round.winnerUsername ? formatAddress(round.winnerUsername) : "No Winner"}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-white font-black uppercase tracking-widest opacity-90">Prize</p>
                            <p className="font-black text-primary text-2xl leading-tight">
                              {formatCurrency(round.prizePool || 0, false)} {PROTOCOL_CONFIG.SYMBOL}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex items-center justify-between gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1 border-white/10 text-[10px] font-black uppercase tracking-widest h-9">
                                  <Search className="w-3.5 h-3.5 mr-1.5" /> Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="glass-card neon-border border-primary/20 bg-black/95 text-white max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-[2rem]">
                                <DialogHeader className="p-5 pb-2 shrink-0">
                                  <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                                    <History className="w-6 h-6 text-primary" />
                                    Round <span className="text-primary">#{round.id}</span>
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
                                  <RoundDetailsModal roundId={round.id} />
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Link href={`/verify?roundId=${round.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full border-white/10 text-[10px] font-black uppercase tracking-widest h-9">
                                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verify
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" className="w-10 h-9 border-white/10 p-0" asChild>
                              <a href={`https://explorer.solana.com/tx/${round.payoutSignature || ''}?cluster=${PROTOCOL_CONFIG.NETWORK}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {data?.rounds.length === 0 && (
                    <div className="text-center py-20 opacity-30 uppercase font-black tracking-widest">
                      No games found
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                    <p className="text-xs md:text-sm text-white font-mono uppercase font-bold tracking-widest text-center md:text-left">
                      Showing {data?.rounds.length} of {data?.total} rounds
                    </p>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="flex-none border-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] px-2 h-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-2 overflow-x-auto max-w-[180px] md:max-w-none no-scrollbar py-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <Button
                            key={i}
                            variant={page === i + 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(i + 1)}
                            className={cn(
                              "min-w-[36px] md:min-w-[44px] h-9 md:h-11 text-xs md:text-base font-black transition-all",
                              page === i + 1 ? "bg-primary text-black scale-105 shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "border-white/10 hover:bg-white/20 text-white"
                            )}
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
                        className="flex-none border-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] px-2 h-8"
                      >
                        <ChevronRight className="w-4 h-4" />
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
