import { useRounds, useJoinRound, useRound, useClaimBingo, useParticipant } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Zap, Globe, Copy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useToast } from "@/hooks/use-toast";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Round, type User, type Participant, ROUND_STATUS, type Transaction } from "@shared/schema";
import { cn } from "@/lib/utils";

import { CountdownTimer } from "@/components/CountdownTimer";
import { JoinButton } from "@/components/JoinButton";
import { BingoClaimButton } from "@/components/BingoClaimButton";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const { toast } = useToast();

  const { data: rounds, isLoading: roundsLoading } = useRounds();
  const latestRound = rounds && rounds.length > 0 ? rounds[0] : null;
  const { data: roundData, isLoading: roundLoading } = useRound(latestRound?.id || 0);

  const { mutate: login } = useMutation({
    mutationFn: (address: string) => apiRequest("POST", "/api/auth/login", { username: address }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    }
  });

  useEffect(() => {
    if (connected && walletAddress) {
      login(walletAddress);
    }
  }, [connected, walletAddress, login]);

  const { data: user } = useQuery<User>({ 
    queryKey: ["/api/auth/me"]
  });
  
  const { data: participant } = useParticipant(latestRound?.id || 0, user?.id);
  
  const foundParticipant = roundData?.participants?.find((p: any) => p.username === walletAddress);
  const isParticipant = !!participant || !!foundParticipant;
  
  const currentCard = (participant?.card as number[][] | undefined) || (foundParticipant && typeof foundParticipant === 'object' && 'card' in foundParticipant ? (foundParticipant as any).card as number[][] : undefined);
  
  const [showWinner, setShowWinner] = useState(false);
  
  useEffect(() => {
    if (roundData?.round.winnerId) {
      // Show popup for participants (Winners/Losers)
      if (isParticipant) {
        setShowWinner(true);
      }
    } else {
      setShowWinner(false);
    }
  }, [roundData?.round.winnerId, isParticipant]);

  const copyCA = () => {
    navigator.clipboard.writeText(PROTOCOL_CONFIG.MINT_ADDRESS);
    toast({
      title: "Contract Address Copied",
      description: "CA copied to clipboard successfully."
    });
  };

  const { data: historyRounds, isLoading: historyLoading } = useQuery<(Round & { winnerUsername: string | null })[]>({
    queryKey: ["/api/rounds/history"],
    refetchInterval: 10000
  });

  const { data: userTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/auth/me/transactions", user?.id],
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  const isLoading = roundsLoading || (latestRound && roundLoading);

  const formatAddress = (address: string) => {
    if (!address || address === "No Winner") return address;
    if (address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const calculateWinProb = (card: number[][], drawn: number[]) => {
    const drawnSet = new Set(drawn);
    let minMissing = 5;

    // Rows
    for (let r = 0; r < 5; r++) {
      const missing = card[r].filter(n => n !== 0 && !drawnSet.has(n)).length;
      minMissing = Math.min(minMissing, missing);
    }
    // Cols
    for (let c = 0; c < 5; c++) {
      let missing = 0;
      for (let r = 0; r < 5; r++) {
        const n = card[r][c];
        if (n !== 0 && !drawnSet.has(n)) missing++;
      }
      minMissing = Math.min(minMissing, missing);
    }
    // Diagonals
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 5; i++) {
      if (card[i][i] !== 0 && !drawnSet.has(card[i][i])) d1++;
      if (card[i][4-i] !== 0 && !drawnSet.has(card[i][4-i])) d2++;
    }
    minMissing = Math.min(minMissing, d1, d2);

    if (minMissing === 0) return 100;
    return Math.max(5, 100 - (minMissing * 20));
  };

  const sortedParticipants = roundData?.participants ? [...roundData.participants].map(p => ({
    ...p,
    prob: calculateWinProb(p.card, roundData.round.drawnNumbers || [])
  })).sort((a, b) => b.prob - a.prob) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col space-y-4 pb-10">
        <header className="flex flex-col md:flex-row items-center justify-between py-4 gap-6 sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 rounded-b-[2rem]">
          <div className="flex items-center gap-4 group cursor-pointer">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-20 h-20 rounded-full p-0 transition-all"
            >
              <img 
                src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                alt="PUMP BINGO" 
                className="w-full h-full rounded-full object-cover"
              />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-4xl font-black font-display tracking-tighter text-white italic leading-none">
                PUMP <span className="text-primary">BINGO</span>
              </h1>
              <p className="text-sm text-primary/80 font-black uppercase tracking-[0.4em]">Provably Fair</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <a 
                href={`https://pump.fun/${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-12 px-8 rounded-full bg-primary/10 border-2 border-primary/50 text-primary text-sm font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
              >
                Buy PUMP <ExternalLink className="w-4 h-4" />
              </a>
              <WalletMultiButton className="!bg-primary !text-black !h-12 !px-8 !text-sm !rounded-full !font-black !italic !tracking-tight !shadow-[0_0_20px_rgba(34,197,94,0.3)] !border-none" />
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col space-y-4">
          <section className="text-center pt-2 pb-2 space-y-4 flex flex-col items-center">
            <div className="relative inline-block">
              <motion.h1 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-7xl md:text-9xl font-black font-display tracking-tighter text-white italic leading-[0.8] mb-1 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                PUMP <span className="text-primary drop-shadow-[0_0_40px_rgba(34,197,94,0.4)]">BINGO</span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 blur-sm"
              />
            </div>
            <p className="text-primary/90 font-black uppercase tracking-[0.8em] text-sm md:text-base italic pl-[0.8em]">PROVABLY FAIR SOLANA GAMING</p>
          </section>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
            </div>
          ) : latestRound && roundData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
              
              <aside className="lg:col-span-3 space-y-8">
                <div className="glass-card neon-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg text-white uppercase font-black tracking-widest font-display">Live Stats</h3>
                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-bold text-primary uppercase">Active</span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-sm text-white/60 font-bold tracking-widest uppercase">Prize Pool</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-primary font-display tracking-tighter drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                          {roundData.round.prizePool.toLocaleString()}
                        </span>
                        <span className="text-sm font-black text-primary italic uppercase tracking-widest">PUMP</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Nodes</p>
                        <p className="text-2xl font-black text-white font-display tracking-tight">{roundData.participantsCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Entry</p>
                        <p className="text-2xl font-black text-white font-display tracking-tight">{PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card neon-border rounded-2xl p-6 flex flex-col h-[320px]">
                  <h3 className="text-lg text-white uppercase font-black tracking-widest mb-6 flex items-center gap-2 font-display">
                    <Users className="w-4 h-4 text-primary" /> Active Players
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {roundData.participants.map((p: any) => (
                        <motion.div 
                          key={p.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group transition-all hover:border-primary/50 hover:bg-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors">
                              {p.username[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white italic tracking-tight">@{formatAddress(p.username)}</span>
                          </div>
                          <ShieldCheck className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {roundData.participants.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-3">
                        <Globe className="w-10 h-10" />
                        <p className="text-xs uppercase font-black tracking-widest text-white">Awaiting Nodes...</p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              <main className="lg:col-span-6 space-y-8">
                {roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING' ? (
                  <div className="glass-card neon-border rounded-[3rem] p-12 text-center flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden">
                    <div className="space-y-10 relative z-10 w-full max-w-md">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                          {roundData.round.status === 'OPEN' ? `Accepting Entries - Round #${roundData.round.id}` : `Game Starting - Round #${roundData.round.id}`}
                        </div>
                        <h2 className="text-5xl md:text-8xl font-black font-display text-white tracking-tighter italic whitespace-nowrap">
                          BINGO <span className="text-primary drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">LOBBY</span>
                        </h2>
                      </div>

                      <div className="p-10 bg-black/60 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                        <p className="text-white/60 text-xs uppercase font-black tracking-[0.2em] mb-6 font-mono">Game Starting In</p>
                        <CountdownTimer 
                          targetDate={roundData.round.startTime?.toString() || null} 
                          status={roundData.round.status}
                          participantCount={roundData.participantsCount}
                        />
                        {roundData.participantsCount < 2 && (
                          <p className="text-primary text-sm uppercase font-black mt-6 animate-pulse tracking-widest font-display">
                            Waiting for at least 2 players to start timer...
                          </p>
                        )}
                      </div>

                      <div className="w-full pt-4">
                        {!connected ? (
                          <div className="space-y-6">
                            <p className="text-white/60 text-xs uppercase font-black tracking-widest italic">Connect Wallet to Start</p>
                            <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !italic !tracking-tighter !text-black shadow-lg" />
                          </div>
                        ) : participant ? (
                          <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl">
                            <p className="text-primary font-black text-3xl italic tracking-tighter mb-1">NODE CONNECTED</p>
                            <p className="text-xs text-primary/70 uppercase font-black tracking-widest">Awaiting Sequence Start...</p>
                          </div>
                        ) : (
                          <JoinButton roundId={roundData.round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-center">
                      <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                    </div>

                    {isParticipant && currentCard ? (
                      <div className="relative space-y-10">
                        <BingoCard 
                          card={currentCard} 
                          drawnNumbers={roundData.round.drawnNumbers || []} 
                          className="w-full max-w-[540px] mx-auto"
                        />
                        
                        <div className="flex justify-center">
                          <BingoClaimButton 
                            roundId={roundData.round.id} 
                            userId={user?.id || 0} 
                            card={currentCard}
                            drawnNumbers={roundData.round.drawnNumbers || []}
                            status={roundData.round.status}
                            isBingoed={participant?.hasBingo || false}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card neon-border rounded-[3rem] p-8 min-h-[500px] flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                        <div className="text-center space-y-4 relative z-10">
                          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                            <Globe className="w-3 h-3 animate-spin-slow" /> Live Feed Active
                          </div>
                          <h2 className="text-4xl md:text-6xl font-black font-display italic text-white tracking-tighter uppercase">
                            SPECTATING <span className="text-primary">ROUND #{roundData.round.id}</span>
                          </h2>
                        </div>

                        <div className="w-full max-w-md space-y-6 relative z-10">
                          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 space-y-4">
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center">Top Contenders</p>
                            <div className="space-y-3 min-h-[120px]">
                              <AnimatePresence mode="popLayout">
                                {roundData.round.status === 'FINISHED' ? (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-4 space-y-4"
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="flex items-center gap-3 text-primary">
                                        <Trophy className="w-6 h-6 animate-bounce" />
                                        <span className="text-xl font-black italic">@{formatAddress(roundData.round.winnerUsername || "")} WON!</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-primary animate-pulse" />
                                        <span className="text-[10px] text-primary font-black uppercase tracking-widest italic">Bingo Validated</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Prize Distributed</p>
                                      <p className="text-2xl font-black text-primary italic">{roundData.round.prizePool} PUMP</p>
                                      <a href={`https://solscan.io/tx/${roundData.round.serverSeed}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[8px] text-primary/60 hover:text-primary transition-colors uppercase font-black tracking-widest">
                                        <ShieldCheck className="w-3 h-3" /> Proof of Payout
                                      </a>
                                    </div>
                                    <p className="text-[8px] text-white/20 uppercase font-black tracking-[0.2em] animate-pulse">Next sequence starting in 5s...</p>
                                  </motion.div>
                                ) : (
                                  sortedParticipants.slice(0, 3).map((p: any, idx) => (
                                    <motion.div 
                                      key={p.id} 
                                      layout
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-primary font-black italic w-6">#{idx+1}</span>
                                        <span className="text-sm font-bold text-white/80 italic">@{formatAddress(p.username)}</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.prob}%` }}
                                            transition={{ duration: 0.5 }}
                                            className="h-full bg-primary"
                                          />
                                        </div>
                                        <span className="text-[10px] font-black text-primary w-8 text-right">{p.prob}%</span>
                                      </div>
                                    </motion.div>
                                  ))
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-white/30 text-[10px] uppercase font-black tracking-[0.3em] italic">Wait for next sequence to engage</p>
                            {!connected && (
                              <div className="mt-6">
                                <WalletMultiButton className="!bg-primary !text-black !h-12 !px-8 !text-sm !rounded-xl !font-black" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </main>

              <aside className="lg:col-span-3 space-y-8">
                <div className="glass-card neon-border rounded-2xl p-6 flex flex-col h-[600px] shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
                      <History className="w-4 h-4 text-primary" /> Game History
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    <div className="space-y-4">
                      {historyLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : historyRounds?.length ? (
                        historyRounds.map((hr) => (
                          <HistoryItem 
                            key={hr.id}
                            id={hr.id} 
                            winner={hr.winnerUsername || "No Winner"} 
                            prize={hr.prizePool} 
                            formatAddress={formatAddress}
                          />
                        ))
                      ) : (
                        <div className="text-center py-10 opacity-30">
                          <p className="text-[10px] uppercase font-black tracking-widest text-white">No history yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-[10px] text-center text-primary uppercase font-black tracking-widest font-mono">PROVABLY FAIR SYSTEM ACTIVE</p>
                  </div>
                </div>

                <div className="glass-card neon-border rounded-2xl p-6 flex flex-col h-[280px]">
                  <h3 className="text-lg text-white uppercase font-black tracking-widest mb-6 flex items-center gap-2 font-display">
                    <ShieldCheck className="w-4 h-4 text-primary" /> My Stats
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {userTransactions?.length ? (
                      userTransactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-white/40 font-mono">{tx.type}</span>
                            <span className="text-xs text-white/60 font-mono">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className={cn(
                            "font-black italic font-display",
                            tx.amount > 0 ? "text-primary" : "text-red-500"
                          )}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-3">
                        <p className="text-[10px] uppercase font-black tracking-widest text-white">No activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

            </div>
          ) : (
            <div className="py-32 text-center bg-card/80 rounded-[4rem] border border-dashed border-white/10 space-y-6 flex-1">
              <Trophy className="w-16 h-16 text-primary mx-auto opacity-20" />
              <h2 className="text-2xl font-black font-display italic text-white tracking-tighter uppercase">INITIALIZING BINGO...</h2>
            </div>
          )}
        </div>
      </div>

      <footer className="w-full py-12 border-t border-white/5 bg-black/40 backdrop-blur-xl rounded-t-[3rem]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 h-12 px-8 rounded-full bg-black/60 border border-primary text-white text-sm font-black uppercase tracking-widest backdrop-blur-md shadow-[0_0_20px_rgba(34,197,94,0.4)]"
            >
              <span className="text-primary font-mono font-bold">CONTRACT:</span>
              <span className="font-mono tracking-tighter text-white font-bold text-base">{formatAddress(PROTOCOL_CONFIG.MINT_ADDRESS)}</span>
              <button 
                onClick={copyCA}
                className="ml-2 p-1.5 rounded-full bg-primary text-black hover:scale-110 transition-all active:scale-95"
              >
                <Copy className="w-4 h-4" />
              </button>
            </motion.div>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.5em] font-mono">Verified Protocol v1.0.4</p>
          </div>

          <div className="flex gap-8 opacity-40 hover:opacity-100 transition-opacity">
            <a href="#" className="text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-colors">Telegram</a>
            <a href="#" className="text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-colors">Discord</a>
          </div>

          <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">© 2026 PUMP BINGO. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>

      <WinnerOverlay 
        show={showWinner} 
        username={roundData?.round.winnerId ? (roundData.participants.find(p => p.id === roundData.round.winnerId)?.username || "WinnerPlayer") : "WinnerPlayer"} 
        prize={roundData?.round.prizePool || 0}
        isWinner={roundData?.round.winnerId === user?.id}
        txHash={roundData?.round.winnerId === user?.id ? "BINGOV1PROOF" : undefined}
        onClose={() => setShowWinner(false)}
      />
    </div>
  );
}

function HistoryItem({ id, winner, prize, formatAddress }: { id: number, winner: string, prize: number, formatAddress: (addr: string) => string }) {
  const explorerUrl = `https://explorer.solana.com/address/${PROTOCOL_CONFIG.MINT_ADDRESS}?cluster=${PROTOCOL_CONFIG.NETWORK}`;
  
  return (
    <a 
      href={explorerUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:border-primary/50 hover:bg-white/10 group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-[10px] text-white tracking-tighter">ROUND #{id}</span>
        <span className="text-primary font-black font-display italic text-sm">+{prize.toLocaleString()} {PROTOCOL_CONFIG.SYMBOL}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-white italic">@{formatAddress(winner)}</span>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-primary/40 group-hover:text-primary transition-colors" />
          <span className="text-[10px] text-white uppercase font-black group-hover:text-white transition-colors">VERIFIED</span>
        </div>
      </div>
    </a>
  );
}
