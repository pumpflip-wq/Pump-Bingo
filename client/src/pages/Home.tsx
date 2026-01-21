import { useRounds, useRound, useParticipant } from "@/hooks/use-game";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Zap, Globe, Copy, ExternalLink, Activity } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-4 flex-1 flex flex-col space-y-4 pb-4">
        <header className="flex items-center justify-between py-4 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50 px-4">
          <div className="flex items-center gap-3">
            <img src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" alt="LOGO" className="w-10 h-10 rounded-full object-cover border border-primary/20" />
            <h1 className="text-xl font-black font-display tracking-tighter italic">PUMP <span className="text-primary">BINGO</span></h1>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/profile">
              <span className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary flex items-center gap-1.5 transition-colors">
                <ShieldCheck className="w-3 h-3" /> Profile
              </span>
            </Link>
            <Link href="/history">
              <span className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary flex items-center gap-1.5 transition-colors">
                <History className="w-3 h-3" /> History
              </span>
            </Link>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <WalletMultiButton className="!bg-primary !text-black !h-9 !px-4 !text-[10px] !rounded-full !font-black !border-none shadow-[0_0_15px_rgba(57,255,20,0.3)]" />
          </div>
        </header>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="mt-4 text-[10px] font-black text-primary uppercase tracking-[0.4em]">Initializing Sequence...</p>
          </div>
        ) : latestRound && roundData ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Sidebar Left: Network Activity */}
            <aside className="xl:col-span-3 space-y-4 order-2 xl:order-1">
              <div className="glass-card neon-border rounded-3xl p-6 bg-black/40">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2 italic">
                  <Activity className="w-3 h-3 text-primary" /> Active Nodes
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {participants.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 group-hover:bg-primary group-hover:text-black">
                          {p.username[0].toUpperCase()}
                        </div>
                        <span className="text-[11px] font-bold text-white/80 italic">@{formatAddress(p.username)}</span>
                      </div>
                      <span className="text-[9px] text-primary font-black uppercase animate-pulse">+100 P</span>
                    </div>
                  ))}
                  {participants.length === 0 && <p className="text-center text-[9px] uppercase font-black opacity-20 py-10">Scanning nodes...</p>}
                </div>
              </div>
            </aside>

            {/* Main Center: Game Area */}
            <main className="xl:col-span-6 space-y-6 order-1 xl:order-2">
              <div className="glass-card neon-border rounded-[2.5rem] bg-black/60 p-8 shadow-2xl relative overflow-hidden min-h-[600px] flex flex-col items-center">
                {/* Compact Info Bar */}
                <div className="w-full flex items-center justify-between mb-8 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">Sequence</span>
                    <span className="text-lg font-black text-white italic">#{(roundData as any).round.id}</span>
                  </div>
                  
                  <div className="text-center bg-primary/10 px-6 py-2 rounded-2xl border border-primary/20">
                    <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] italic">Jackpot Pool</p>
                    <p className="text-3xl font-black text-primary font-display drop-shadow-[0_0_15px_rgba(57,255,20,0.4)] animate-pulse">
                      {(roundData as any).round.prizePool.toLocaleString()} <span className="text-sm">PUMP</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">Live Nodes</span>
                    <span className="text-lg font-black text-white italic">{(roundData as any).participantsCount}</span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                   <Activity className="w-3 h-3 text-primary animate-pulse" />
                   <span className="text-[9px] font-black text-white/60 uppercase tracking-widest italic">
                     {(roundData as any).round.status === 'OPEN' || (roundData as any).round.status === 'STARTING' ? 'Sequence Initializing' : 'Sequence In Progress'}
                   </span>
                </div>

                {/* Main Action Component */}
                {(roundData as any).round.status === 'OPEN' || (roundData as any).round.status === 'STARTING' ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-10 w-full">
                    <div className="p-10 bg-black/80 rounded-[3rem] border-2 border-primary/30 backdrop-blur-3xl shadow-2xl max-w-sm w-full text-center">
                      <p className="text-white/40 text-[9px] uppercase font-black tracking-[0.4em] mb-8 font-mono italic">Start Countdown</p>
                      <CountdownTimer 
                        targetDate={(roundData as any).round.startTime?.toString() || null} 
                        status={(roundData as any).round.status}
                        participantCount={(roundData as any).participantsCount}
                      />
                    </div>
                    
                    <div className="w-full max-w-xs">
                      {!connected ? (
                        <div className="text-center space-y-4">
                          <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Connect to Engage</p>
                          <WalletMultiButton className="!bg-primary !text-black !h-14 !px-8 !text-lg !rounded-2xl !w-full !font-black !shadow-[0_0_20px_rgba(57,255,20,0.3)]" />
                        </div>
                      ) : participant ? (
                        <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-[2rem] text-center">
                          <p className="text-primary font-black text-2xl italic tracking-tighter animate-pulse">NODE ENGAGED</p>
                        </div>
                      ) : (
                        <JoinButton roundId={(roundData as any).round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center space-y-10 w-full">
                    <LastCalledNumber numbers={(roundData as any).round.drawnNumbers || []} />
                    
                    {isParticipant && currentCard ? (
                      <div className="w-full flex flex-col items-center space-y-8">
                        <BingoCard card={currentCard} drawnNumbers={(roundData as any).round.drawnNumbers || []} className="w-full max-w-[500px]" />
                        <BingoClaimButton 
                          roundId={(roundData as any).round.id} 
                          userId={user?.id || 0} 
                          card={currentCard}
                          drawnNumbers={(roundData as any).round.drawnNumbers || []}
                          status={(roundData as any).round.status}
                          isBingoed={participant?.hasBingo || false}
                        />
                      </div>
                    ) : (
                      <div className="text-center space-y-6 pt-10">
                        <Globe className="w-12 h-12 text-primary mx-auto animate-spin-slow opacity-20" />
                        <p className="text-xl font-black italic text-white/40 uppercase tracking-tighter">SPECTATING SEQUENCE</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic animate-pulse">Wait for next cycle to join</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>

            {/* Sidebar Right: Analytics */}
            <aside className="xl:col-span-3 space-y-4 order-3">
              <div className="glass-card neon-border rounded-3xl p-6 bg-black/40">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2 italic">
                  <Zap className="w-3 h-3 text-primary" /> Probability Analysis
                </h3>
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {sortedParticipants.slice(0, 6).map((p: any, idx: number) => (
                      <div key={p.id} className="space-y-2 group">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-white/60 italic">#{idx+1} @{formatAddress(p.username)}</span>
                          <span className="text-primary italic">{p.prob}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${p.prob}%` }}
                            className="h-full bg-gradient-to-r from-primary/40 to-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </AnimatePresence>
                  {sortedParticipants.length === 0 && <p className="text-center text-[9px] uppercase font-black opacity-20 py-10">Nodes calibrating...</p>}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 bg-primary/5 border border-primary/20 text-center">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] italic mb-1">Network Synchronization</p>
                <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-white/40">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                   FEED SYNCHRONIZED
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
            <Globe className="w-16 h-16 text-primary animate-spin-slow" />
            <h2 className="mt-4 text-sm font-black text-white uppercase tracking-[0.5em]">Establishing Connection...</h2>
          </div>
        )}
      </div>

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
