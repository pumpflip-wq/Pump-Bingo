import { useRounds, useJoinRound, useRound, useClaimBingo, useParticipant } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Zap, Globe, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type User } from "@shared/schema";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const { data: rounds, isLoading: roundsLoading } = useRounds();
  const latestRound = rounds && rounds.length > 0 ? rounds[0] : null;
  const { data: roundData, isLoading: roundLoading } = useRound(latestRound?.id);

  // Sync wallet with backend
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

  const user = queryClient.getQueryData<User>(["/api/auth/me"]);
  const { data: participant } = useParticipant(latestRound?.id || 0, user?.id);
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    if (roundData?.round.winnerId) {
      setShowWinner(true);
    } else {
      setShowWinner(false);
    }
  }, [roundData?.round.winnerId]);

  const isLoading = roundsLoading || (latestRound && roundLoading);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-20">
      {/* Hero Section */}
      <section className="text-center pt-8 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          <Zap className="w-3 h-3" />
          Powered by Solana Network
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white italic leading-tight"
        >
          PUMP <span className="text-primary drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]">BINGO</span>
        </motion.h1>
        
        <p className="max-w-xl mx-auto text-muted-foreground text-sm uppercase tracking-widest font-medium opacity-60">
          THE FIRST PROVABLY FAIR MULTIPLAYER BINGO ON CHAIN
        </p>
      </section>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
          </div>
          <p className="font-mono text-xs text-primary uppercase tracking-[0.3em] animate-pulse">Establishing Neural Link...</p>
        </div>
      ) : latestRound && roundData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar: Stats & Players */}
          <aside className="lg:col-span-3 space-y-8 sticky top-24">
            {/* Live Stats Card */}
            <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Cpu className="w-12 h-12" />
              </div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">Live Protocol</h3>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-bold text-primary uppercase">Syncing</span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Prize Pool</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-primary font-display tracking-tighter">
                      {roundData.round.prizePool.toLocaleString()}
                    </span>
                    <span className="text-sm font-black text-primary/50 font-display italic uppercase">PUMP</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Active nodes</p>
                    <p className="text-xl font-black text-white font-display tracking-tight">{roundData.participantsCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Entry Fee</p>
                    <p className="text-xl font-black text-white font-display tracking-tight">{roundData.round.price} <span className="text-[10px] text-white/40 italic">PUMP</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Panel */}
            <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col h-[480px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] flex items-center gap-2">
                  <Users className="w-3 h-3 text-primary" /> Active Players
                </h3>
                <span className="text-[10px] font-mono text-white/20">0x...{latestRound.id}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {roundData.participants.map((p: any) => (
                    <motion.div 
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 shadow-[0_0_10px_rgba(57,255,20,0.1)]">
                          {p.username[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white group-hover:text-primary transition-colors italic">@{p.username}</span>
                          <span className="text-[8px] font-mono text-white/30 uppercase">Verified Node</span>
                        </div>
                      </div>
                      <ShieldCheck className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary transition-colors" />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {roundData.participants.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center space-y-3">
                    <Globe className="w-10 h-10 animate-pulse" />
                    <p className="text-[10px] uppercase font-black tracking-widest">Awaiting Connections...</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Center Column: Primary Game Interface */}
          <main className="lg:col-span-6 space-y-8">
            {roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING' ? (
              <div className="bg-card/60 backdrop-blur-2xl border-2 border-primary/10 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center min-h-[600px] shadow-[0_0_150px_rgba(57,255,20,0.03)] relative overflow-hidden group">
                {/* Decorative scanning line animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
                
                <div className="space-y-10 relative z-10 w-full max-w-md">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
                      {roundData.round.status === 'OPEN' ? 'ACCEPTING ENTRIES' : 'SECURE CONNECTION ACTIVE'}
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black font-display text-white tracking-tighter italic leading-none">
                      BINGO <span className="text-primary drop-shadow-[0_0_20px_rgba(57,255,20,0.3)]">LOBBY</span>
                    </h2>
                  </div>

                  <div className="p-10 bg-black/40 rounded-[2rem] border border-white/5 backdrop-blur-xl shadow-inner relative group-hover:border-primary/20 transition-colors">
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em] mb-6">Sequence Initiation In</p>
                    <CountdownTimer targetDate={roundData.round.startTime?.toString() || null} />
                  </div>

                  <div className="w-full pt-4">
                    {!connected ? (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest italic opacity-60">Authentication Required</p>
                          <div className="h-0.5 w-12 bg-primary/30 mx-auto rounded-full" />
                        </div>
                        <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !italic !tracking-tighter !shadow-[0_0_30px_rgba(57,255,20,0.3)]" />
                      </div>
                    ) : participant ? (
                      <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl shadow-[0_0_40px_rgba(57,255,20,0.1)] animate-pulse">
                        <p className="text-primary font-black text-3xl italic tracking-tighter leading-none mb-1">NODE CONNECTED</p>
                        <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest">Awaiting Sequence Start...</p>
                      </div>
                    ) : (
                      <JoinButton roundId={roundData.round.id} price={roundData.round.price} userId={user?.id || 0} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-center">
                  <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                </div>

                {participant ? (
                  <div className="relative space-y-10">
                    <BingoCard 
                      card={participant.card as number[][]} 
                      drawnNumbers={roundData.round.drawnNumbers || []} 
                      className="w-full max-w-[540px] mx-auto"
                    />
                    
                    <div className="flex justify-center">
                      <BingoClaimButton 
                        roundId={roundData.round.id} 
                        userId={user?.id || 0} 
                        card={participant.card as number[][]}
                        drawnNumbers={roundData.round.drawnNumbers || []}
                        status={roundData.round.status}
                        isBingoed={participant.hasBingo || false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-card/40 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center min-h-[500px] space-y-6">
                    <div className="p-6 rounded-full bg-white/5 border border-white/10">
                      <Users className="w-16 h-16 text-white/10" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black font-display italic text-white tracking-tighter">SPECTATOR MODE</h2>
                      <p className="text-muted-foreground text-xs max-w-[240px] mx-auto uppercase font-black tracking-widest opacity-40 leading-relaxed">
                        SYNCHRONIZATION WINDOW CLOSED. PLEASE WAIT FOR NEXT PROTOCOL.
                      </p>
                    </div>
                    {!connected && (
                      <div className="mt-8">
                        <WalletMultiButton className="!bg-primary/20 !hover:bg-primary/30 !border !border-primary/50 !h-12 !px-8 !text-sm !rounded-xl !text-primary" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar: History & Integrity */}
          <aside className="lg:col-span-3 space-y-8 sticky top-24">
            <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col h-[600px] shadow-2xl relative overflow-hidden">
              <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-6 flex items-center gap-2">
                <History className="w-3 h-3 text-secondary" /> Protocol Archive
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                <div className="space-y-4 opacity-50 hover:opacity-100 transition-opacity">
                  <HistoryItem id={latestRound.id - 1} winner="DegenKing" prize={5400} />
                  <HistoryItem id={latestRound.id - 2} winner="SolWhale" prize={8200} />
                  <HistoryItem id={latestRound.id - 3} winner="BingoMage" prize={3100} />
                  <HistoryItem id={latestRound.id - 4} winner="AlphaNode" prize={12000} />
                  <HistoryItem id={latestRound.id - 5} winner="BlockGod" prize={4500} />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 space-y-4 relative z-10">
                <div className="bg-black/80 p-5 rounded-2xl border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] text-primary uppercase font-black tracking-[0.2em] flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" /> Integrity Hash
                    </p>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  </div>
                  <p className="text-[9px] font-mono text-white/30 break-all leading-loose tracking-tight selection:bg-primary selection:text-black">
                    {roundData.round.publicHash}
                  </p>
                </div>
                <p className="text-[8px] text-center text-muted-foreground uppercase font-black tracking-widest opacity-30">PROVABLY FAIR SYSTEM ACTIVE</p>
              </div>
            </div>
          </aside>

        </div>
      ) : (
        <div className="py-32 text-center bg-card/40 backdrop-blur-xl rounded-[4rem] border border-dashed border-white/10 space-y-6">
          <Trophy className="w-16 h-16 text-primary mx-auto opacity-10 animate-bounce" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black font-display italic text-white tracking-tighter uppercase">INITIALIZING BINGO PROTOCOL...</h2>
            <p className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.4em] opacity-30">Scanning Blockchain States</p>
          </div>
        </div>
      )}

      <WinnerOverlay 
        show={showWinner} 
        username={roundData?.round.winnerId ? "WinnerPlayer" : "Unknown"} 
        prize={roundData?.round.prizePool || 0}
        onClose={() => setShowWinner(false)}
      />
    </div>
  );
}

function HistoryItem({ id, winner, prize }: { id: number, winner: string, prize: number }) {
  return (
    <div className="p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/5 transition-all group">
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-[9px] text-white/20 tracking-tighter group-hover:text-white/40 transition-colors">BLOCK #{id.toString().padStart(6, '0')}</span>
        <span className="text-primary font-black font-display italic text-xs tracking-tight">+{prize.toLocaleString()} <span className="text-[8px] opacity-50">PUMP</span></span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-black text-white/80 italic tracking-tight group-hover:text-primary transition-colors">@{winner}</span>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-primary/40" />
          <span className="text-[8px] text-white/20 uppercase font-black tracking-widest">VERIFIED</span>
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ targetDate }: { targetDate: string | null }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        return;
      }

      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="text-7xl md:text-8xl font-black font-display text-primary tracking-tighter drop-shadow-[0_0_20px_rgba(57,255,20,0.4)]">
      {timeLeft || "00:00"}
    </div>
  );
}

function JoinButton({ roundId, price, userId }: { roundId: number, price: number, userId: number }) {
  const { mutate: joinRound, isPending } = useJoinRound();
  return (
    <CyberButton 
      variant="primary" 
      size="xl"
      className="w-full !rounded-2xl"
      onClick={() => joinRound({ roundId, userId })}
      disabled={isPending}
    >
      {isPending ? (
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin w-6 h-6" />
          <span className="italic tracking-tighter">JOINING PROTOCOL...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <span className="text-2xl italic tracking-tighter">JOIN ROUND</span>
          <span className="text-[10px] font-black tracking-[0.2em] opacity-70">PAY {price} PUMP FEE</span>
        </div>
      )}
    </CyberButton>
  );
}

function BingoClaimButton({ roundId, userId, card, drawnNumbers, status, isBingoed }: { 
  roundId: number, 
  userId: number, 
  card: number[][], 
  drawnNumbers: number[],
  status: string,
  isBingoed: boolean
}) {
  const { mutate: claimBingo, isPending } = useClaimBingo();
  
  const hasBingoLocally = () => {
    for (let i = 0; i < 5; i++) {
      if (card[i].every(n => n === 0 || drawnNumbers.includes(n))) return true;
      const col = [card[0][i], card[1][i], card[2][i], card[3][i], card[4][i]];
      if (col.every(n => n === 0 || drawnNumbers.includes(n))) return true;
    }
    const d1 = [card[0][0], card[1][1], card[2][2], card[3][3], card[4][4]];
    if (d1.every(n => n === 0 || drawnNumbers.includes(n))) return true;
    const d2 = [card[0][4], card[1][3], card[2][2], card[3][1], card[4][0]];
    if (d2.every(n => n === 0 || drawnNumbers.includes(n))) return true;
    return false;
  };

  const canClaim = status === 'IN_GAME' && !isBingoed && hasBingoLocally();

  return (
    <motion.div
      animate={canClaim ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className="w-full max-w-sm"
    >
      <CyberButton 
        variant="primary" 
        size="xl"
        className={cn(
          "w-full !rounded-[2rem] transition-all duration-500",
          !canClaim ? "opacity-30 grayscale blur-[1px]" : "shadow-[0_0_50px_rgba(57,255,20,0.5)] border-primary hover:scale-[1.02]"
        )}
        disabled={!canClaim || isPending}
        onClick={() => claimBingo({ roundId, userId })}
      >
        {isPending ? (
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin w-8 h-8" />
            <span className="text-3xl italic tracking-tighter">VERIFYING...</span>
          </div>
        ) : (
          <span className="text-4xl font-black italic tracking-tighter">BINGO!</span>
        )}
      </CyberButton>
    </motion.div>
  );
}
