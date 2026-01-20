import { useRounds, useJoinRound, useRound, useClaimBingo, useParticipant } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Zap, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Round, type User, type Participant, ROUND_STATUS, type Transaction } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();

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
  
  // Also check roundData for current user's participation if hook is lagging
  const foundParticipant = roundData?.participants?.find((p: any) => p.username === walletAddress);
  const isParticipant = !!participant || !!foundParticipant;
  
  const currentCard = (participant?.card as number[][] | undefined) || (foundParticipant && typeof foundParticipant === 'object' && 'card' in foundParticipant ? (foundParticipant as any).card as number[][] : undefined);
  
  const [showWinner, setShowWinner] = useState(false);
  
  useEffect(() => {
    // Only set showWinner if the winnerId is different from previous or exists
    if (roundData?.round.winnerId) {
      setShowWinner(true);
    } else {
      setShowWinner(false);
    }
  }, [roundData?.round.winnerId]);

  useEffect(() => {
    // Play sound or effect when a new number is drawn
    if (roundData?.round.drawnNumbers && roundData.round.drawnNumbers.length > 0) {
      const lastNumber = roundData.round.drawnNumbers[roundData.round.drawnNumbers.length - 1];
      // Logic for drawing effect can be added here if needed
    }
  }, [roundData?.round.drawnNumbers?.length]);

  const { data: userTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/auth/me/transactions", user?.id],
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  const isLoading = roundsLoading || (latestRound && roundLoading);

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-20">
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
          PUMP <span className="text-primary">BINGO</span>
        </motion.h1>
      </section>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
        </div>
      ) : latestRound && roundData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <aside className="lg:col-span-3 space-y-8">
            <div className="bg-card/80 border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg text-white uppercase font-black tracking-widest">Live Stats</h3>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-primary uppercase">Active</span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-sm text-white font-bold tracking-widest">Prize Pool</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-primary font-display tracking-tighter">
                      {roundData.round.prizePool.toLocaleString()}
                    </span>
                    <span className="text-sm font-black text-primary italic uppercase">PUMP</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-white font-bold tracking-widest">Nodes</p>
                    <p className="text-xl font-black text-white font-display">{roundData.participantsCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white font-bold tracking-widest">Entry</p>
                    <p className="text-xl font-black text-white font-display">{roundData.round.price}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card/80 border border-white/10 rounded-2xl p-6 flex flex-col h-[320px]">
              <h3 className="text-lg text-white uppercase font-black tracking-widest mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Active Players
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {roundData.participants.map((p: any) => (
                    <motion.div 
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20">
                          {p.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-white italic">@{formatAddress(p.username)}</span>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-primary/40" />
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
            
            <div className="bg-card/80 border border-white/10 rounded-2xl p-6 flex flex-col h-[280px]">
              <h3 className="text-lg text-white uppercase font-black tracking-widest mb-6 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> My Transactions
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {userTransactions?.length ? (
                  userTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-white/40">{tx.type}</span>
                        <span className="text-xs text-white/60">{new Date(tx.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={cn(
                        "font-black italic",
                        tx.amount > 0 ? "text-primary" : "text-red-500"
                      )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-3">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white">No history</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-6 space-y-8">
            {roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING' ? (
              <div className="bg-card/80 border-2 border-white/5 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden">
                <div className="space-y-10 relative z-10 w-full max-w-md">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                      {roundData.round.status === 'OPEN' ? 'Accepting Entries' : 'Game Starting'}
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black font-display text-white tracking-tighter italic">
                      BINGO <span className="text-primary">LOBBY</span>
                    </h2>
                  </div>

                  <div className="p-10 bg-black/40 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                    <p className="text-white text-xs uppercase font-black tracking-[0.2em] mb-6">Sequence Initiation In</p>
                    <CountdownTimer 
                      targetDate={roundData.round.startTime?.toString() || null} 
                      status={roundData.round.status}
                      participantCount={roundData.participantsCount}
                    />
                    {roundData.participantsCount < 2 && (
                      <p className="text-primary text-[10px] uppercase font-black mt-4 animate-pulse">
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
                      <JoinButton roundId={roundData.round.id} price={roundData.round.price} userId={user?.id || 0} />
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
                  <div className="text-center py-20 bg-card/80 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center min-h-[500px] space-y-6">
                    <h2 className="text-3xl font-black font-display italic text-white tracking-tighter">SPECTATOR MODE</h2>
                    <p className="text-white/40 text-xs uppercase font-black tracking-widest">WAIT FOR NEXT PROTOCOL</p>
                    {!connected && (
                      <WalletMultiButton className="!bg-primary !text-black !h-12 !px-8 !text-sm !rounded-xl !font-black" />
                    )}
                  </div>
                )}
              </div>
            )}
          </main>

          <aside className="lg:col-span-3">
            <div className="bg-card/80 border border-white/10 rounded-2xl p-6 flex flex-col h-[600px] shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Game History
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                <div className="space-y-4">
                  <HistoryItem id={latestRound.id - 1} winner="DegenKing" prize={5400} />
                  <HistoryItem id={latestRound.id - 2} winner="SolWhale" prize={8200} />
                  <HistoryItem id={latestRound.id - 3} winner="BingoMage" prize={3100} />
                  <HistoryItem id={latestRound.id - 4} winner="AlphaNode" prize={12000} />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-[10px] text-center text-primary uppercase font-black tracking-widest">PROVABLY FAIR SYSTEM ACTIVE</p>
              </div>
            </div>
          </aside>

        </div>
      ) : (
        <div className="py-32 text-center bg-card/80 rounded-[4rem] border border-dashed border-white/10 space-y-6">
          <Trophy className="w-16 h-16 text-primary mx-auto opacity-20" />
          <h2 className="text-2xl font-black font-display italic text-white tracking-tighter uppercase">INITIALIZING BINGO...</h2>
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
  const explorerUrl = `https://explorer.solana.com/tx/sample-tx-id?cluster=devnet`;
  
  return (
    <a 
      href={explorerUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:border-primary/50 hover:bg-white/10 group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-[10px] text-white tracking-tighter">ROUND #{id}</span>
        <span className="text-primary font-black font-display italic text-sm">+{prize.toLocaleString()} PUMP</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-white italic">@{winner}</span>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-primary/40 group-hover:text-primary transition-colors" />
          <span className="text-[10px] text-white uppercase font-black group-hover:text-white transition-colors">VERIFIED</span>
        </div>
      </div>
    </a>
  );
}

function CountdownTimer({ targetDate, status, participantCount }: { targetDate: string | null | undefined, status: string, participantCount: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const updateTimer = () => {
      // If we are in OPEN status and have less than 2 players, strictly show 01:00
      if (status === "OPEN" && participantCount < 2) {
        setTimeLeft("01:00");
        return;
      }

      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        return;
      }

      const totalSeconds = Math.ceil(diff / 1000);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60);
      
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, status, participantCount]);

  return (
    <div className="text-8xl font-black font-display text-primary tracking-tighter drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]">
      {timeLeft || "01:00"}
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
        <Loader2 className="animate-spin w-6 h-6" />
      ) : (
        <div className="flex flex-col items-center">
          <span className="text-2xl italic tracking-tighter">JOIN ROUND</span>
          <span className="text-[10px] font-black tracking-widest opacity-80">{price} PUMP</span>
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
          "w-full !rounded-[2rem] shadow-xl",
          !canClaim ? "opacity-30 grayscale" : "shadow-primary/40 border-primary"
        )}
        disabled={!canClaim || isPending}
        onClick={() => claimBingo({ roundId, userId })}
      >
        {isPending ? (
          <Loader2 className="animate-spin w-8 h-8" />
        ) : (
          <span className="text-4xl font-black italic tracking-tighter">BINGO!</span>
        )}
      </CyberButton>
    </motion.div>
  );
}
