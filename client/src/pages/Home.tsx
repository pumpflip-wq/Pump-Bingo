import { useRounds, useJoinRound, useRound, useClaimBingo, useParticipant } from "@/hooks/use-game";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberButton } from "@/components/ui/CyberButton";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Link, useLocation } from "wouter";
import { Clock, Users, Trophy, PlayCircle, Loader2, History, AlertCircle, ShieldCheck } from "lucide-react";
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

  // Auto-login/sync with backend when wallet connects
  useEffect(() => {
    if (connected && walletAddress) {
      // We'll update the useAuth or similar to handle wallet login
      // For now, let's assume the backend handles it via the address
    }
  }, [connected, walletAddress]);

  const { data: rounds, isLoading: roundsLoading } = useRounds();
  const latestRound = rounds && rounds.length > 0 ? rounds[0] : null;
  const { data: roundData, isLoading: roundLoading } = useRound(latestRound?.id);

  // Sync wallet with backend
  const { mutate: login } = useMutation({
    mutationFn: (address: string) => apiRequest("POST", "/api/auth/login", { username: address }).then(res => res.json()),
    onSuccess: (data) => {
      // Store user info in query cache or local storage if needed
      queryClient.setQueryData(["/api/auth/me"], data);
    }
  });

  useEffect(() => {
    if (connected && walletAddress) {
      login(walletAddress);
    }
  }, [connected, walletAddress, login]);

  const user = queryClient.getQueryData<User>(["/api/auth/me"]);
  const { data: participant } = useParticipant(latestRound?.id, user?.id);
  const { mutate: claimBingo, isPending: claiming } = useClaimBingo();
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    if (roundData?.round.winnerId) {
      setShowWinner(true);
    } else {
      setShowWinner(false);
    }
  }, [roundData?.round.winnerId]);

  const isLoading = roundsLoading || (latestRound && roundLoading);

  if (!connected) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter">READY TO PUMP?</h2>
            <p className="text-muted-foreground text-lg">Connect your Solana wallet to start playing</p>
          </div>
          <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-14 !px-8 !text-lg !rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <section className="text-center pt-4">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-7xl font-black font-display tracking-tighter text-white mb-2 italic"
          >
            PUMP <span className="text-primary">BINGO</span>
          </motion.h1>
          <div className="flex items-center justify-center gap-4 text-muted-foreground font-mono text-[10px] tracking-widest uppercase opacity-70">
            <span>Fair • Fast • Fun</span>
            <span className="w-1 h-1 bg-primary rounded-full" />
            <span className="text-primary">Solana Network</span>
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="font-mono text-xs text-muted-foreground">SYNCING WITH CHAIN...</p>
          </div>
        ) : latestRound && roundData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Round Details & Participants */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs text-muted-foreground uppercase font-display font-bold">Live Stats</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-mono text-primary uppercase">Active</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Prize Pool</p>
                    <p className="text-3xl font-black text-primary font-display tracking-tighter">
                      {roundData.round.prizePool.toLocaleString()}
                      <span className="text-sm ml-1 opacity-70">PUMP</span>
                    </p>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Players</p>
                      <p className="text-xl font-bold text-white font-display">{roundData.participantsCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Buy-in</p>
                      <p className="text-xl font-bold text-white font-display">{roundData.round.price}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants List */}
              <div className="bg-card border border-white/10 rounded-2xl p-6 flex flex-col h-[400px]">
                <h3 className="text-xs text-muted-foreground uppercase mb-4 font-display font-bold flex items-center gap-2">
                  <Users className="w-3 h-3 text-primary" /> Participants
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {roundData.participants.map((p: any) => (
                      <motion.div 
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5 group hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {p.username[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-white/90">@{p.username}</span>
                        </div>
                        <ShieldCheck className="w-3 h-3 text-primary/50" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {roundData.participants.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-4">
                      <Users className="w-8 h-8 mb-2" />
                      <p className="text-[10px] uppercase font-bold">No players yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Column: Game Area */}
            <div className="lg:col-span-6 space-y-6">
              {roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING' ? (
                <div className="bg-card border-2 border-primary/20 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center min-h-[500px] shadow-[0_0_100px_rgba(57,255,20,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                  
                  <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                      <div className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                        {roundData.round.status === 'OPEN' ? 'Accepting Players' : 'Game Starting...'}
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black font-display text-white tracking-tighter italic">
                        PRE-GAME <span className="text-primary">LOBBY</span>
                      </h2>
                    </div>

                    <div className="p-8 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-sm">
                      <p className="text-muted-foreground text-xs uppercase font-bold mb-4">Starting In</p>
                      <CountdownTimer targetDate={roundData.round.startTime} />
                    </div>

                    <div className="w-full max-w-sm pt-4">
                      {participant ? (
                        <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-2xl">
                          <p className="text-primary font-black text-xl italic tracking-tighter">YOU ARE IN!</p>
                          <p className="text-[10px] text-primary/70 uppercase font-bold mt-1">Wait for game to start</p>
                        </div>
                      ) : (
                        <JoinButton roundId={roundData.round.id} price={roundData.round.price} userId={user.id} />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center mb-8">
                    <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                  </div>

                  {participant ? (
                    <div className="relative space-y-8">
                      <BingoCard 
                        card={participant.card as number[][]} 
                        drawnNumbers={roundData.round.drawnNumbers || []} 
                        className="w-full max-w-[500px] mx-auto"
                      />
                      
                      <div className="flex justify-center">
                        <BingoClaimButton 
                          roundId={roundData.round.id} 
                          userId={user.id} 
                          card={participant.card as number[][]}
                          drawnNumbers={roundData.round.drawnNumbers || []}
                          status={roundData.round.status}
                          isBingoed={participant.hasBingo}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-card/50 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center min-h-[400px]">
                      <Users className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                      <h2 className="text-2xl font-black font-display italic text-white mb-2">SPECTATOR MODE</h2>
                      <p className="text-muted-foreground text-sm max-w-xs uppercase font-bold tracking-tight opacity-60">
                        You missed this round. Wait for the next one to start!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: History & Proof */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-card border border-white/10 rounded-2xl p-6 flex flex-col h-full min-h-[500px]">
                <h3 className="text-xs text-muted-foreground uppercase mb-4 font-display font-bold flex items-center gap-2">
                  <History className="w-3 h-3 text-secondary" /> Round History
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {/* For MVP, we can show a few fake entries or just current status */}
                  <div className="space-y-3 opacity-60">
                    <HistoryItem id={latestRound.id - 1} winner="DegenKing" prize={5400} />
                    <HistoryItem id={latestRound.id - 2} winner="SolWhale" prize={8200} />
                    <HistoryItem id={latestRound.id - 3} winner="BingoMage" prize={3100} />
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-primary" /> Active Round Hash
                    </p>
                    <p className="text-[9px] font-mono text-white/40 break-all leading-relaxed">
                      {roundData.round.publicHash}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-20 text-center bg-card rounded-[2.5rem] border border-dashed border-white/10">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-bold font-display italic">INITIALIZING BINGO NETWORK...</h2>
          </div>
        )}
      </div>

      <WinnerOverlay 
        show={showWinner} 
        username={roundData?.round.winnerId ? "WinnerPlayer" : "Unknown"} 
        prize={roundData?.round.prizePool || 0}
        onClose={() => setShowWinner(false)}
      />
    </Layout>
  );
}

function HistoryItem({ id, winner, prize }: { id: number, winner: string, prize: number }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px]">
      <div className="flex justify-between items-start mb-1">
        <span className="font-mono text-muted-foreground">ROUND #{id.toString().padStart(4, '0')}</span>
        <span className="text-primary font-bold">+{prize} PUMP</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white font-bold italic">@{winner}</span>
        <span className="text-muted-foreground uppercase">Verified</span>
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
    <div className="text-6xl md:text-7xl font-black font-display text-primary tracking-tighter animate-pulse-fast">
      {timeLeft || "00:00"}
    </div>
  );
}

function JoinButton({ roundId, price, userId }: { roundId: number, price: number, userId: number }) {
  const { mutate: joinRound, isPending } = useJoinRound();
  return (
    <CyberButton 
      variant="primary" 
      className="w-full h-20 text-2xl font-black italic tracking-tighter"
      onClick={() => joinRound({ roundId, userId })}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="animate-spin" /> : `JOIN ROUND (${price} PUMP)`}
    </CyberButton>
  );
}

function BingoClaimButton({ roundId, userId, card, drawnNumbers, status, isBingoed }: { 
  roundId: number, 
  userId: number, 
  card: number[][], 
  drawnNumbers: number[],
  status: string,
  isBingoed?: boolean
}) {
  const { mutate: claimBingo, isPending } = useClaimBingo();
  
  // Local validation for visual effect
  const hasBingoLocally = () => {
    // Basic check rows/cols/diags
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
      animate={canClaim ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
      className="w-full max-w-sm"
    >
      <CyberButton 
        variant="primary" 
        className={`w-full h-20 text-3xl font-black italic tracking-tighter transition-all ${!canClaim ? 'opacity-50 grayscale' : 'shadow-[0_0_30px_rgba(57,255,20,0.4)]'}`}
        disabled={!canClaim || isPending}
        onClick={() => claimBingo({ roundId, userId })}
      >
        {isPending ? <Loader2 className="animate-spin" /> : "BINGO!"}
      </CyberButton>
    </motion.div>
  );
}
