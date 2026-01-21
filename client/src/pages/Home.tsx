import { useRounds, useJoinRound, useRound, useClaimBingo, useParticipant } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Zap, Globe, Copy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
  
  const isLoading = roundsLoading || (latestRound && roundLoading);

  const foundParticipant = roundData?.participants?.find((p: any) => p.username === walletAddress);
  const isParticipant = !!participant || !!foundParticipant;
  
  const currentCard = (participant?.card as number[][] | undefined) || (foundParticipant && typeof foundParticipant === 'object' && 'card' in foundParticipant ? (foundParticipant as any).card as number[][] : undefined);
  
  const [showWinner, setShowWinner] = useState(false);
  const [hasShownWinner, setHasShownWinner] = useState(false);
  
  useEffect(() => {
    if (roundData?.round.status === 'FINISHED' && roundData?.round.winnerId) {
      if (isParticipant && !hasShownWinner) {
        setShowWinner(true);
        setHasShownWinner(true);
      }
    } else if (roundData?.round.status !== 'FINISHED') {
      setShowWinner(false);
      setHasShownWinner(false);
    }
  }, [roundData?.round.status, roundData?.round.winnerId, isParticipant, hasShownWinner]);

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

  const stats = useMemo(() => {
    if (!userTransactions) return { wins: 0, losses: 0, pnl: 0 };
    const wins = userTransactions.filter(tx => tx.type === "PRIZE").length;
    const losses = userTransactions.filter(tx => tx.type === "BUY_IN").length;
    const pnl = userTransactions.reduce((acc, tx) => acc + tx.amount, 0);
    return { wins, losses, pnl };
  }, [userTransactions]);

  useEffect(() => {
    if (roundData?.round.drawnNumbers && roundData.round.drawnNumbers.length > 0) {
      // Use more reliable CDN for game sounds
      const drawSound = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3");
      drawSound.volume = 0.4;
      drawSound.play().catch(e => console.log("Sound play failed:", e));
    }
  }, [roundData?.round.drawnNumbers?.length]);

  useEffect(() => {
    if (roundData?.round.status === 'FINISHED' && roundData.round.winnerId) {
      const winSound = new Audio("https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3");
      winSound.volume = 0.5;
      winSound.play().catch(e => console.log("Sound play failed:", e));
    }
  }, [roundData?.round?.status, roundData?.round?.winnerId]);

  useEffect(() => {
    if (participant) {
      const joinSound = new Audio("https://cdn.pixabay.com/audio/2022/03/10/audio_c3527058c0.mp3");
      joinSound.volume = 0.3;
      joinSound.play().catch(e => console.log("Sound play failed:", e));
    }
  }, [!!participant]);

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
    <>
      <div className="flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 pt-0">
        <header className="flex flex-col md:flex-row items-center justify-between pb-4 pt-0 gap-6 sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 rounded-b-[2rem] mb-6">
          <Link href="/" className="flex items-center gap-4 group cursor-pointer hover:opacity-90 transition-opacity">
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
            </div>
          </Link>

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
            <section className="text-center pt-2 pb-2 space-y-4 flex flex-col items-center hidden">
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
            </section>

            {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
            </div>
          ) : latestRound && roundData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
              
            <aside className="lg:col-span-3 space-y-4 flex flex-col h-[750px]">
                <div className="glass-card neon-border rounded-2xl p-6 flex flex-col flex-1 overflow-hidden min-h-0 bg-black/20">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
                      <Users className="w-4 h-4 text-primary" /> Active Players
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {[
                        ...(walletAddress && sortedParticipants.some(p => p.username === walletAddress) 
                          ? [] 
                          : (walletAddress && (participant || foundParticipant) ? [{ id: 'me', username: walletAddress, prob: 0 }] : [])),
                        ...sortedParticipants
                      ].map((p: any) => {
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
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border transition-colors",
                                isMe 
                                  ? "bg-primary text-black border-primary" 
                                  : "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary group-hover:text-black"
                              )}>
                                {roundData.round.status === 'IN_GAME' ? `#${p.ranking || sortedParticipants.indexOf(p) + 1}` : p.username[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white italic tracking-tight flex items-center gap-1">
                                  @{formatAddress(p.username)}
                                  {isMe && <span className="text-[10px] text-primary font-black">(YOU)</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-primary/60 font-black font-mono">100 PUMP</span>
                                  {roundData.round.status === 'IN_GAME' && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                          style={{ width: `${p.prob}%` }}
                                          className="h-full bg-primary"
                                        />
                                      </div>
                                      <span className="text-[8px] font-black text-primary">{p.prob}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ShieldCheck className={cn(
                              "w-4 h-4 transition-colors",
                              isMe ? "text-primary" : "text-primary/40 group-hover:text-primary"
                            )} />
                          </motion.div>
                        );
                      })}
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

                  <main className="lg:col-span-6 space-y-4 h-[750px] flex flex-col overflow-hidden">
                {roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING' ? (
                  <div className="glass-card neon-border rounded-[3rem] p-8 text-center flex flex-col items-center justify-center min-h-0 h-full relative overflow-hidden shrink-0">
                    <div className="space-y-6 relative z-10 w-full">
                      {/* Integrated Stats Header - Outside black box, inside green border, with its own glass-card style */}
                      <div className="glass-card neon-border rounded-2xl p-6 bg-black/60 border-primary/30 flex flex-row items-center justify-between w-full">
                        <div className="flex flex-col text-left">
                          <p className="text-xs text-white uppercase font-black tracking-widest font-mono mb-1">Prize Pool</p>
                          <span className="text-4xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">{roundData.round.prizePool} PUMP</span>
                        </div>
                        <div className="flex gap-12">
                          <div className="text-right">
                            <p className="text-xs text-white uppercase font-black tracking-widest font-mono mb-1">Players</p>
                            <p className="text-2xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white uppercase font-black tracking-widest font-mono mb-1">Entry</p>
                            <p className="text-2xl font-black text-white font-display italic leading-none">{PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE}</p>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 h-fit self-center">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs text-primary font-black uppercase tracking-widest">Active</span>
                          </div>
                        </div>
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
                            Waiting for players...
                          </p>
                        )}
                      </div>

                      <div className="w-full pt-4 max-w-md mx-auto">
                        {!connected ? (
                          <div className="space-y-6">
                            <p className="text-white/60 text-xs uppercase font-black tracking-widest italic">Connect Wallet to Start</p>
                            <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !italic !tracking-tighter !text-black shadow-lg" />
                          </div>
                        ) : participant || foundParticipant ? (
                          <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl">
                            <p className="text-primary font-black text-3xl italic tracking-tighter mb-1 uppercase text-center">YOU'RE IN THE GAME!</p>
                            <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest text-center whitespace-nowrap">Waiting for players or round start...</p>
                          </div>
                        ) : (
                          <JoinButton roundId={roundData.round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 overflow-hidden h-full flex flex-col">
                    <div className="glass-card neon-border rounded-2xl p-6 flex flex-row items-center justify-between bg-black/60 border-primary/30 shrink-0">
                      <div className="flex flex-col">
                        <p className="text-xs text-white uppercase font-black tracking-widest font-mono mb-1">Prize Pool</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">{roundData.round.prizePool} PUMP</span>
                        </div>
                      </div>
                      <div className="flex gap-12">
                        <div className="text-right">
                          <p className="text-xs text-white uppercase font-black tracking-widest font-mono mb-1">Players</p>
                          <p className="text-2xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white uppercase font-black tracking-widest font-mono mb-1">Entry</p>
                          <p className="text-2xl font-black text-white font-display italic leading-none">{PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE}</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 h-fit self-center">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs text-primary font-black uppercase tracking-widest">Active</span>
                        </div>
                      </div>
                    </div>

                    {isParticipant && currentCard ? (
                      <div className="relative space-y-6 flex flex-col items-center">
                          <BingoCard 
                          card={currentCard} 
                          drawnNumbers={roundData.round.drawnNumbers || []} 
                          className="w-full max-w-[550px] scale-100 mb-4"
                        />
                        
                        <div className="flex justify-center w-full max-w-[550px]">
                          <BingoClaimButton 
                            roundId={roundData.round.id} 
                            userId={user?.id || 0} 
                            card={currentCard}
                            drawnNumbers={roundData.round.drawnNumbers || []}
                            status={roundData.round.status}
                            isBingoed={participant?.hasBingo || false}
                            className="w-full h-20 text-3xl font-black italic tracking-tighter"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card neon-border rounded-[3rem] p-8 min-h-[500px] flex flex-col items-center justify-center space-y-8 relative overflow-hidden flex-1">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                        <div className="text-center space-y-4 relative z-10">
                          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                            <Globe className="w-3 h-3 animate-spin-slow" /> Live Feed Active
                          </div>
                          <h2 className="text-4xl md:text-6xl font-black font-display italic text-white tracking-tighter uppercase">
                            WATCHING <span className="text-primary">LIVE</span>
                          </h2>
                        </div>

                        <div className="w-full max-w-md space-y-6 relative z-10">
                          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 space-y-4">
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center">Live Probability Feed</p>
                            <div className="space-y-4 min-h-[120px]">
                              <AnimatePresence mode="popLayout">
                                {sortedParticipants.slice(0, 3).map((p: any, idx: number) => (
                                  <motion.div 
                                    key={p.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-primary font-black italic w-6">#{idx + 1}</span>
                                      <span className="text-sm font-bold text-white/80 italic">@{formatAddress(p.username)}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
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
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </main>

            <aside className="lg:col-span-3 flex flex-col h-[750px]">
                <div className="glass-card neon-border rounded-2xl p-6 flex flex-col shrink-0 bg-black/40 border-primary/20 mb-4">
                  <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                </div>

                <div className="glass-card neon-border rounded-2xl p-6 flex flex-col flex-1 overflow-hidden bg-black/20">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2 font-display">
                      <History className="w-4 h-4 text-primary" /> Game History
                    </h3>
                    <Link href="/verify" className="text-[10px] font-black text-primary/60 hover:text-primary uppercase tracking-widest underline transition-colors">Full View</Link>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    <div className="space-y-4">
                      {historyLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : historyRounds?.length ? (
                        historyRounds.slice(0, 10).map((hr) => (
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
                  
                  <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary/60">
                        <span>Current Room #{roundData.round.id} Hash</span>
                        <Link href="/verify" className="underline hover:text-primary transition-colors">Verify</Link>
                      </div>
                      <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-primary/10">
                        <p className="text-[10px] font-mono text-primary truncate flex-1">
                          {roundData.round.publicHash}
                        </p>
                        <Copy 
                          className="w-3 h-3 text-primary/40 cursor-pointer hover:text-primary transition-colors" 
                          onClick={() => {
                            navigator.clipboard.writeText(roundData.round.publicHash);
                            toast({ title: "Hash Copied" });
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-center text-primary uppercase font-black tracking-widest font-mono">PROVABLY FAIR SYSTEM ACTIVE</p>
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

      <WinnerOverlay 
        show={showWinner} 
        username={roundData?.round.winnerId ? (roundData.participants.find(p => p.id === roundData.round.winnerId)?.username || "WinnerPlayer") : "WinnerPlayer"} 
        prize={roundData?.round.prizePool || 0}
        isWinner={roundData?.round.winnerId === user?.id}
        txHash={roundData?.round.winnerId === user?.id ? "BINGOV1PROOF" : undefined}
        onClose={() => setShowWinner(false)}
      />
    </>
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
