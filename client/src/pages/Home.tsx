import { useRounds, useRound, useParticipant } from "@/hooks/use-game";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Zap, Globe, Copy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Round, type User, ROUND_STATUS } from "@shared/schema";

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
  
  const participants = (roundData as any)?.participants || [];
  const foundParticipant = participants.find((p: any) => p.username === walletAddress);
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

  const isLoading = roundsLoading || (latestRound && roundLoading);

  const formatAddress = (address: string) => {
    if (!address || address === "No Winner") return address;
    if (address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const calculateWinProb = (card: number[][], drawn: number[]) => {
    const drawnSet = new Set(drawn);
    let minMissing = 5;

    for (let r = 0; r < 5; r++) {
      const missing = card[r].filter(n => n !== 0 && !drawnSet.has(n)).length;
      minMissing = Math.min(minMissing, missing);
    }
    for (let c = 0; c < 5; c++) {
      let missing = 0;
      for (let r = 0; r < 5; r++) {
        const n = card[r][c];
        if (n !== 0 && !drawnSet.has(n)) missing++;
      }
      minMissing = Math.min(minMissing, missing);
    }
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 5; i++) {
      if (card[i][i] !== 0 && !drawnSet.has(card[i][i])) d1++;
      if (card[i][4-i] !== 0 && !drawnSet.has(card[i][4-i])) d2++;
    }
    minMissing = Math.min(minMissing, d1, d2);

    if (minMissing === 0) return 100;
    return Math.max(5, 100 - (minMissing * 20));
  };

  const sortedParticipants = participants.map((p: any) => ({
    ...p,
    prob: calculateWinProb(p.card, roundData?.round.drawnNumbers || [])
  })).sort((a: any, b: any) => b.prob - a.prob);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col space-y-8 pb-10">
        <header className="flex flex-col md:flex-row items-center justify-between py-6 gap-6 sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-8 rounded-b-[3rem]">
          <div className="flex items-center gap-4 group cursor-pointer">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-16 h-16 rounded-full p-0 transition-all"
            >
              <img 
                src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                alt="PUMP BINGO" 
                className="w-full h-full rounded-full object-cover"
              />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black font-display tracking-tighter text-white italic leading-none">
                PUMP <span className="text-primary">BINGO</span>
              </h1>
              <p className="text-[10px] text-primary/80 font-black uppercase tracking-[0.4em]">Provably Fair</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-8 mr-4">
              <Link href="/profile">
                <span className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/60 hover:text-primary transition-colors flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Profile
                </span>
              </Link>
              <Link href="/history">
                <span className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/60 hover:text-primary transition-colors flex items-center gap-2">
                  <History className="w-4 h-4" /> History
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={`https://pump.fun/${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-11 px-6 rounded-full bg-primary/10 border-2 border-primary/50 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2"
              >
                Buy PUMP <ExternalLink className="w-3 h-3" />
              </a>
              <WalletMultiButton className="!bg-primary !text-black !h-11 !px-6 !text-[10px] !rounded-full !font-black !italic !tracking-tight !border-none" />
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col space-y-12 items-center">
          <section className="text-center space-y-4 flex flex-col items-center">
            <div className="relative inline-block">
              <motion.h1 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white italic leading-[0.8] mb-1 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                PUMP <span className="text-primary drop-shadow-[0_0_40px_rgba(34,197,94,0.4)]">BINGO</span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 blur-sm"
              />
            </div>
            <p className="text-primary/90 font-black uppercase tracking-[0.8em] text-xs md:text-sm italic pl-[0.8em]">PROVABLY FAIR SOLANA GAMING</p>
          </section>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
            </div>
          ) : latestRound && roundData ? (
            <div className="max-w-4xl w-full flex-1 flex flex-col space-y-16">
              
              <main className="space-y-16">
                {(roundData as any).round.status === 'OPEN' || (roundData as any).round.status === 'STARTING' ? (
                  <div className="glass-card neon-border rounded-[4rem] p-16 text-center flex flex-col items-center justify-start min-h-[750px] relative overflow-hidden shadow-[0_0_100px_rgba(34,197,94,0.1)]">
                    <div className="space-y-16 relative z-10 w-full">
                      <div className="grid grid-cols-3 gap-10 mb-4 w-full">
                        <div className="glass-card bg-black/60 border-primary/20 p-10 rounded-[2rem] text-center shadow-2xl">
                          <p className="text-xs text-primary font-black uppercase tracking-widest mb-2 italic">Sequence</p>
                          <p className="text-4xl font-black text-white font-display">#{(roundData as any).round.id}</p>
                        </div>
                        <div className="glass-card bg-primary/20 border-primary/60 p-12 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(34,197,94,0.3)] scale-125 z-20">
                          <p className="text-xs text-primary font-black uppercase tracking-widest mb-2 italic">Jackpot Pool</p>
                          <p className="text-6xl font-black text-primary font-display drop-shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-pulse">{(roundData as any).round.prizePool.toLocaleString()} <span className="text-2xl">PUMP</span></p>
                        </div>
                        <div className="glass-card bg-black/60 border-primary/20 p-10 rounded-[2rem] text-center shadow-2xl">
                          <p className="text-xs text-primary font-black uppercase tracking-widest mb-2 italic">Nodes</p>
                          <p className="text-4xl font-black text-white font-display">{(roundData as any).participantsCount}</p>
                        </div>
                      </div>

                      <div className="p-12 bg-black/80 rounded-[3rem] border-2 border-primary/30 backdrop-blur-3xl shadow-2xl relative overflow-hidden max-w-2xl mx-auto">
                        <div className="absolute top-0 left-0 w-full h-2 bg-primary animate-pulse" />
                        <p className="text-white/60 text-[10px] uppercase font-black tracking-[0.4em] mb-10 font-mono italic">Initialization Countdown</p>
                        <CountdownTimer 
                          targetDate={(roundData as any).round.startTime?.toString() || null} 
                          status={(roundData as any).round.status}
                          participantCount={(roundData as any).participantsCount}
                        />
                        {(roundData as any).participantsCount < 2 && (
                          <p className="text-primary text-xs uppercase font-black mt-10 animate-pulse tracking-[0.3em] font-display italic">
                            Awaiting minimum node density...
                          </p>
                        )}
                      </div>

                      <div className="w-full pt-4 max-w-md mx-auto">
                        {!connected ? (
                          <div className="space-y-8">
                            <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.5em] italic">Connect Wallet to Interface</p>
                            <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-20 !px-12 !text-2xl !rounded-3xl !w-full !font-black !italic !tracking-tighter !text-black shadow-[0_0_40px_rgba(34,197,94,0.4)]" />
                          </div>
                        ) : participant ? (
                          <div className="p-12 bg-primary/10 border-4 border-primary/40 rounded-[3rem] shadow-[0_0_60px_rgba(34,197,94,0.2)] animate-pulse">
                            <p className="text-primary font-black text-5xl italic tracking-tighter mb-3">NODE ENGAGED</p>
                            <p className="text-xs text-primary/70 uppercase font-black tracking-[0.4em]">Data Stream Validated</p>
                          </div>
                        ) : (
                          <JoinButton roundId={(roundData as any).round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                        )}
                      </div>

                      <div className="pt-20 border-t border-white/5 w-full">
                        <h3 className="text-base text-white/60 uppercase font-black tracking-[0.5em] mb-12 flex items-center justify-center gap-4 font-display italic">
                          <Users className="w-5 h-5 text-primary" /> Network Participants
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <AnimatePresence mode="popLayout">
                            {participants.map((p: any) => (
                              <motion.div 
                                key={p.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-2xl border border-white/10 group transition-all hover:border-primary/50 hover:bg-white/10 shadow-xl"
                              >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-base font-black text-primary border-2 border-primary/20 group-hover:bg-primary group-hover:text-black transition-all">
                                  {p.username[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="text-xs font-bold text-white italic tracking-tight">@{formatAddress(p.username)}</span>
                                  <span className="text-[10px] text-primary font-black uppercase tracking-widest animate-pulse">+100 PUMP</span>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {participants.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-6">
                              <Globe className="w-20 h-20 animate-spin-slow text-primary" />
                              <p className="text-xs uppercase font-black tracking-[0.8em] text-white">Scanning Global Network...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-16 w-full flex flex-col items-center">
                    <div className="glass-card bg-black/60 border-primary/30 p-10 rounded-[3rem] flex items-center justify-around w-full shadow-2xl relative overflow-hidden max-w-4xl">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                      <div className="text-center">
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">Sequence</p>
                        <p className="text-3xl font-black text-white font-display italic">#{(roundData as any).round.id}</p>
                      </div>
                      <div className="text-center scale-125 z-10">
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">Jackpot</p>
                        <p className="text-5xl font-black text-primary font-display drop-shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse italic">{(roundData as any).round.prizePool.toLocaleString()} PUMP</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">Nodes</p>
                        <p className="text-3xl font-black text-white font-display italic">{(roundData as any).participantsCount}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center scale-110">
                      <LastCalledNumber numbers={(roundData as any).round.drawnNumbers || []} />
                    </div>

                    {isParticipant && currentCard ? (
                      <div className="relative space-y-16 w-full flex flex-col items-center">
                        <BingoCard 
                          card={currentCard} 
                          drawnNumbers={(roundData as any).round.drawnNumbers || []} 
                          className="w-full max-w-[700px] shadow-[0_0_100px_rgba(34,197,94,0.15)]"
                        />
                        
                        <div className="flex justify-center scale-125">
                          <BingoClaimButton 
                            roundId={(roundData as any).round.id} 
                            userId={user?.id || 0} 
                            card={currentCard}
                            drawnNumbers={(roundData as any).round.drawnNumbers || []}
                            status={(roundData as any).round.status}
                            isBingoed={participant?.hasBingo || false}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card neon-border rounded-[4rem] p-16 min-h-[600px] flex flex-col items-center justify-center space-y-16 relative overflow-hidden w-full max-w-4xl shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                        <div className="text-center space-y-8 relative z-10">
                          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-[0.3em] italic animate-pulse">
                            <Globe className="w-4 h-4 animate-spin-slow" /> Network Feed Synchronized
                          </div>
                          <h2 className="text-6xl md:text-8xl font-black font-display italic text-white tracking-tighter uppercase leading-none">
                            SPECTATING <span className="text-primary">SEQUENCE #{(roundData as any).round.id}</span>
                          </h2>
                        </div>

                        <div className="w-full max-w-3xl space-y-10 relative z-10">
                          <div className="bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-12 space-y-8 shadow-2xl relative">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full">LIVE TELEMETRY</div>
                            <p className="text-xs text-white/40 uppercase font-black tracking-[0.4em] text-center italic">Probability Analysis</p>
                            <div className="space-y-6 min-h-[200px]">
                              <AnimatePresence mode="popLayout">
                                {(roundData as any).round.status === 'FINISHED' ? (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-8 space-y-10"
                                  >
                                    <div className="flex flex-col items-center gap-6">
                                      <div className="flex items-center gap-6 text-primary scale-125">
                                        <Trophy className="w-16 h-16 animate-bounce" />
                                        <span className="text-5xl font-black italic tracking-tighter">@{formatAddress(participants.find((p: any) => p.id === (roundData as any).round.winnerId)?.username || "")} WON!</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-primary animate-pulse" />
                                        <span className="text-sm text-primary font-black uppercase tracking-[0.3em] italic">Consensus Reached - Bingo Validated</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-4 bg-primary/5 p-8 rounded-[2rem] border border-primary/20 w-full">
                                      <p className="text-xs text-white/40 uppercase font-black tracking-widest">Rewards Distributed</p>
                                      <p className="text-6xl font-black text-primary italic drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">{(roundData as any).round.prizePool.toLocaleString()} PUMP</p>
                                      <a href={`https://solscan.io/tx/${(roundData as any).round.serverSeed}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs text-primary/60 hover:text-primary transition-colors uppercase font-black tracking-[0.2em] mt-4">
                                        <ShieldCheck className="w-5 h-5" /> View Proof on Explorer
                                      </a>
                                    </div>
                                    <p className="text-xs text-white/20 uppercase font-black tracking-[0.5em] animate-pulse italic">Next Sequence Sequence starting in 5s...</p>
                                  </motion.div>
                                ) : (
                                  sortedParticipants.slice(0, 5).map((p: any, idx: number) => (
                                    <motion.div 
                                      key={p.id} 
                                      layout
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all group"
                                    >
                                      <div className="flex items-center gap-6">
                                        <span className="text-primary font-black italic w-12 text-3xl">#{idx+1}</span>
                                        <span className="text-xl font-bold text-white/90 italic">@{formatAddress(p.username)}</span>
                                      </div>
                                      <div className="flex items-center gap-10 flex-1 max-w-[300px] ml-auto">
                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.prob}%` }}
                                            transition={{ duration: 0.5 }}
                                            className="h-full bg-gradient-to-r from-primary/40 to-primary shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                                          />
                                        </div>
                                        <span className="text-sm font-black text-primary w-16 text-right">{p.prob}%</span>
                                      </div>
                                    </motion.div>
                                  ))
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-white/20 text-xs uppercase font-black tracking-[0.5em] italic">Synchronize with the next sequence to engage</p>
                            {!connected && (
                              <div className="mt-12">
                                <WalletMultiButton className="!bg-primary !text-black !h-16 !px-12 !text-lg !rounded-2xl !font-black !shadow-[0_0_40px_rgba(34,197,94,0.3)]" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          ) : (
            <div className="py-40 text-center bg-black/40 rounded-[5rem] border-2 border-dashed border-white/5 space-y-8 flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
              <Trophy className="w-24 h-24 text-primary opacity-20 animate-pulse" />
              <h2 className="text-4xl font-black font-display italic text-white/40 tracking-tighter uppercase">Initializing Global Protocol...</h2>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
        </div>
      </div>

      <footer className="w-full py-16 border-t border-white/5 bg-black/60 backdrop-blur-3xl rounded-t-[5rem]">
        <div className="max-w-4xl mx-auto px-10 flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-4 h-14 px-10 rounded-full bg-black/80 border-2 border-primary/30 text-white text-base font-black uppercase tracking-widest backdrop-blur-md shadow-[0_0_30px_rgba(34,197,94,0.2)]"
            >
              <span className="text-primary font-mono font-bold italic">CA:</span>
              <span className="font-mono tracking-tighter text-white font-bold text-lg">{PROTOCOL_CONFIG.MINT_ADDRESS.slice(0, 16)}...</span>
              <button 
                onClick={copyCA}
                className="ml-4 p-2 rounded-full bg-primary text-black hover:scale-110 transition-all active:scale-95 shadow-lg"
              >
                <Copy className="w-5 h-5" />
              </button>
            </motion.div>
            <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.8em] font-mono">Consensus Validated Protocol v1.0.8</p>
          </div>

          <div className="flex gap-12 opacity-30 hover:opacity-100 transition-opacity">
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.4em] text-white hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.4em] text-white hover:text-primary transition-colors">Telegram</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.4em] text-white hover:text-primary transition-colors">Discord</a>
          </div>

          <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.5em]">© 2026 PUMP BINGO. DECENTRALIZED GAMING PROTOCOL.</p>
        </div>
      </footer>

      <WinnerOverlay 
        show={showWinner} 
        username={(roundData as any)?.round.winnerId ? (participants.find((p: any) => p.id === (roundData as any).round.winnerId)?.username || "WinnerPlayer") : "WinnerPlayer"} 
        prize={(roundData as any)?.round.prizePool || 0}
        isWinner={(roundData as any)?.round.winnerId === user?.id}
        txHash={(roundData as any)?.round.winnerId === user?.id ? "BINGOV1PROOF" : undefined}
        onClose={() => setShowWinner(false)}
      />
    </div>
  );
}
