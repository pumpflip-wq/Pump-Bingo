import { Link } from "wouter";
import { api } from "@shared/routes";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { PlayerList } from "@/components/game/PlayerList";
import { GameHistory } from "@/components/game/GameHistory";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import {
  Users,
  Trophy,
  Loader2,
  AlertTriangle,
  Globe2,
  History,
  Gamepad2,
  ShieldCheck,
  Menu,
  X,
  Zap,
  Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ROUND_STATUS } from "@shared/schema";
import { SiX } from "react-icons/si";
import { CountdownTimer } from "@/components/CountdownTimer";
import { JoinButton } from "@/components/JoinButton";
import { BingoClaimButton } from "@/components/BingoClaimButton";
import { BingoCard } from "@/components/BingoCard";
import { useGameState } from "@/hooks/useGameState";

function ModeSelector({ selected, onChange }: { selected: 'FREE' | 'PAID'; onChange: (m: 'FREE' | 'PAID') => void }) {
  return (
    <div className="flex items-stretch p-[3px] bg-black/60 border border-white/10 rounded-xl backdrop-blur-sm" data-testid="mode-selector">
      <button
        onClick={() => onChange('FREE')}
        data-testid="button-mode-free"
        className={`flex-1 py-2.5 px-6 rounded-[9px] font-black uppercase text-xs tracking-[0.15em] transition-all duration-200 ${
          selected === 'FREE'
            ? 'bg-primary text-black shadow-[0_0_16px_rgba(34,197,94,0.25)]'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        Free Play
      </button>
      <button
        onClick={() => onChange('PAID')}
        data-testid="button-mode-paid"
        className={`flex-1 py-2.5 px-6 rounded-[9px] font-black uppercase text-xs tracking-[0.15em] transition-all duration-200 ${
          selected === 'PAID'
            ? 'bg-amber-500 text-black shadow-[0_0_16px_rgba(245,158,11,0.25)]'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        100 {PROTOCOL_CONFIG.SYMBOL}
      </button>
    </div>
  );
}

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<'FREE' | 'PAID'>('PAID');

  const {
    user,
    walletAddress,
    connected,
    roundData,
    latestRound,
    isLoading,
    error,
    historyRounds,
    historyLoading,
  } = useGameState(selectedMode);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"game" | "players" | "history">("game");

  useEffect(() => {
    if (roundData?.round?.status) {
      queryClient.invalidateQueries({ 
        queryKey: [api.rounds.list.path],
        refetchType: 'all'
      });
      if (roundData.round.id) {
        queryClient.invalidateQueries({ 
          queryKey: [api.rounds.get.path, roundData.round.id],
          refetchType: 'all'
        });
      }
    }
  }, [roundData?.round?.status, roundData?.participantsCount, roundData?.round?.id]);

  const myParticipant = useMemo(() => {
    if (!walletAddress || !roundData?.participants) return null;
    return roundData.participants.find(
      (p: any) => p.username === walletAddress,
    );
  }, [walletAddress, roundData?.participants]);

  const [hasManuallyClosed, setHasManuallyClosed] = useState(false);
  const completionTimeRef = useRef<{ roundId: number; time: number } | null>(null);

  useEffect(() => {
    const currentRoundId = roundData?.round?.id;
    const hasWinner = !!roundData?.round?.winnerId;
    const roundStatus = roundData?.round?.status;

    if ((hasWinner || roundStatus === ROUND_STATUS.FINISHED) && currentRoundId) {
      if (!completionTimeRef.current || completionTimeRef.current.roundId !== currentRoundId) {
        completionTimeRef.current = { roundId: currentRoundId, time: Date.now() };
        setHasManuallyClosed(false);
      }
    }

    if (currentRoundId && !hasWinner && completionTimeRef.current?.roundId !== currentRoundId) {
      completionTimeRef.current = null;
      setHasManuallyClosed(false);
    }
  }, [roundData?.round?.id, roundData?.round?.winnerId, roundData?.round?.status]);

  const currentCard = myParticipant?.card as number[][] | undefined;
  const isParticipant = !!myParticipant;

  const calculateWinProbLocal = (card: number[][], drawn: number[]) => {
    const drawnSet = new Set(drawn);
    drawnSet.add(0);
    if (drawn.length <= 1) return 0;
    const lines = [
      ...Array(5).fill(0).map((_, r) => card[r]),
      ...Array(5).fill(0).map((_, c) => card.map((r) => r[c])),
      Array(5).fill(0).map((_, i) => card[i][i]),
      Array(5).fill(0).map((_, i) => card[i][4 - i]),
    ];
    let maxMarked = 0;
    let potentialLines = 0;
    let totalMarked = 0;
    lines.forEach((line) => {
      const marked = line.filter((n) => drawnSet.has(n)).length;
      if (marked > maxMarked) maxMarked = marked;
      if (marked === 4) potentialLines++;
    });
    card.flat().forEach((num) => {
      if (num !== 0 && drawnSet.has(num)) totalMarked++;
    });
    if (maxMarked === 5) return 100;
    if (totalMarked >= 1 && drawn.length > 0) {
      const hitDensity = (totalMarked / 24) * 20;
      let baseLineProb = 0;
      if (maxMarked === 2) baseLineProb = 10;
      else if (maxMarked === 3) baseLineProb = 30;
      else if (maxMarked === 4) baseLineProb = 60;
      const proximityBonus = potentialLines * 15;
      const gameProgress = (drawn.length / 75) * 15;
      const finalProb = Math.min(99, Math.floor(baseLineProb + hitDensity + proximityBonus + gameProgress));
      return Math.max(1, finalProb);
    }
    return 0;
  };

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedParticipants = useMemo(() => {
    if (!roundData?.participants) return [];
    const participantMap = new Map();
    const list = [...roundData.participants].sort((a: any, b: any) => (a.txSignature ? 2 : 1) - (b.txSignature ? 2 : 1));
    list.forEach((p: any) => {
      const key = p.userId ? String(p.userId) : p.username;
      if (!key || p.username === PROTOCOL_CONFIG.ADMIN_WALLET) return;
      if (!participantMap.has(key) || (!participantMap.get(key).txSignature && p.txSignature)) {
        participantMap.set(key, p);
      }
    });
    return Array.from(participantMap.values())
      .map((p: any) => ({
        ...p,
        prob: p.finalWinProb || calculateWinProbLocal(p.card, roundData.round.drawnNumbers || []),
      }))
      .sort((a, b) => b.prob - a.prob);
  }, [roundData?.participants, roundData?.round?.drawnNumbers]);

  const overlayState = useMemo(() => {
    const winnerDeclaredAt = completionTimeRef.current?.time;
    // Check if the round is actually in a state that should show the winner
    const isRoundOver = roundData?.round.status === ROUND_STATUS.FINISHED || !!roundData?.round.winnerId;
    
    if (isRoundOver && winnerDeclaredAt) {
      const elapsed = currentTime - winnerDeclaredAt;
      const totalDisplayTime = 10000; // 10 seconds
      
      const winnerId = roundData?.round.winnerId || (roundData?.round.status === ROUND_STATUS.FINISHED ? roundData?.round.winnerUserId : null);
      const winner = roundData?.participants?.find((p: any) => Number(p.userId || p.id) === Number(winnerId));
      
      const isMe = Number(winnerId) === Number(user?.id);
      const amIParticipant = isParticipant;

      return {
        show: true,
        username: winner?.username || (isMe ? walletAddress : winnerId?.toString() || "Unknown"),
        prize: roundData?.round.prizePool || 0,
        isWinner: isMe,
        isParticipant: amIParticipant,
        txHash: roundData?.round.payoutSignature || undefined,
        timeLeft: Math.max(0, Math.floor((totalDisplayTime - elapsed) / 1000)),
        currentRoundId: completionTimeRef.current?.roundId,
        isExpired: elapsed >= totalDisplayTime || hasManuallyClosed
      };
    }
    return null;
  }, [roundData, user?.id, walletAddress, hasManuallyClosed, currentTime, isParticipant]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1 h-[calc(100vh-200px)] lg:h-auto">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1 text-center h-[calc(100vh-200px)] lg:h-auto">
        <AlertTriangle className="w-16 h-16 text-destructive animate-pulse" />
        <p className="font-mono text-xs text-destructive uppercase tracking-[0.3em]">System Link Failure</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 font-black italic uppercase">Reconnect Protocol</Button>
      </div>
    );
  }

  if (!latestRound || !roundData) return null;

  const isWaitingForCA = PROTOCOL_CONFIG.NETWORK === "mainnet-beta" && !PROTOCOL_CONFIG.MINT_ADDRESS;

  const desktopView = (
    <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start flex-1">
      <aside className="lg:col-span-3 space-y-4 flex flex-col h-[750px]">
        <PlayerList participants={sortedParticipants} walletAddress={walletAddress} formatAddress={formatAddress} roundStatus={roundData.round.status} roundData={roundData} />
      </aside>
      <main className="lg:col-span-6 space-y-4 h-[750px] flex flex-col overflow-hidden relative" style={{ perspective: "1000px" }}>
        <AnimatePresence mode="wait">
          {overlayState?.show && !overlayState.isExpired ? (
            <motion.div 
              key="winner-post-game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="glass-card neon-border rounded-[3rem] p-8 text-center flex flex-col items-center justify-center h-full relative overflow-hidden bg-black/80 backdrop-blur-3xl"
            >
              <div className="space-y-8 z-10">
                <Trophy className="w-24 h-24 text-primary mx-auto animate-bounce" />
                <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                  {overlayState.isWinner ? "YOU WON!" : "ROUND OVER!"}
                </h2>
                <div className="space-y-2">
                  <p className="text-primary text-xl font-black uppercase tracking-widest">Winner</p>
                  <p className="text-4xl font-mono text-white">{formatAddress(overlayState.username ?? '')}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-primary text-xl font-black uppercase tracking-widest">Prize Pool</p>
                  <p className="text-6xl font-black text-white font-display italic">
                    {formatCurrency(overlayState.prize)} <span className="text-primary">{PROTOCOL_CONFIG.SYMBOL}</span>
                  </p>
                </div>
                <div className="pt-8">
                  <p className="text-white/60 text-sm uppercase font-black tracking-[0.3em]">Next Round in {overlayState.timeLeft}s</p>
                </div>
              </div>
              {/* Background Glow */}
              <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
            </motion.div>
          ) : roundData.round.status === "OPEN" || roundData.round.status === "STARTING" ? (
            <motion.div key="waiting" initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 90 }} transition={{ duration: 0.8 }} className="glass-card neon-border rounded-[3rem] p-8 text-center flex flex-col items-center justify-between h-full relative overflow-hidden">
               <div className="flex-1 flex flex-col items-center justify-between py-4 w-full h-full">
                  <div className="w-full space-y-8">
                    <div className="glass-card neon-border rounded-2xl p-8 bg-black/60 border-primary/30 flex flex-col items-center gap-6 w-full">
                      <div className="flex flex-row items-center justify-center gap-24 w-full">
                        <div className="flex flex-col text-center">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Room</p>
                          <p className="text-5xl font-black text-white font-display italic leading-none">#{roundData.round.id}</p>
                        </div>
                        <div className="flex flex-col text-center scale-110">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Prize Pool</p>
                          <div className="flex flex-col items-center">
                            <span className="text-7xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">{formatCurrency(roundData.round.prizePool || 0)}</span>
                            <span className="text-3xl text-primary font-black uppercase tracking-widest mt-1">{PROTOCOL_CONFIG.SYMBOL}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Players</p>
                          <p className="text-5xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                        </div>
                      </div>
                      {/* Mode badge */}
                      {(roundData.round as any).mode === 'PAID' ? (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">100 {PROTOCOL_CONFIG.SYMBOL} Entry</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-primary">Free Play</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isWaitingForCA ? (
                    <div className="py-8 px-10 bg-black/60 rounded-[2rem] border border-primary/30 backdrop-blur-2xl shadow-2xl w-full max-w-2xl my-auto flex flex-col justify-center items-center">
                      <Globe2 className="w-16 h-16 text-primary animate-pulse mb-4" />
                      <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">PROTOCOL INITIALIZING</h2>
                      <p className="text-primary text-sm uppercase font-black tracking-[0.2em] animate-pulse">Waiting for Token CA Deployment...</p>
                    </div>
                  ) : (
                    <div className="py-8 px-10 bg-black/60 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl w-full max-w-2xl my-auto flex flex-col justify-center items-center">
                      <p className="text-white text-lg uppercase font-black tracking-[0.2em] mb-4">GAME STARTING IN</p>
                      <CountdownTimer secondsRemaining={roundData.secondsRemaining} status={roundData.round.status} participantCount={roundData.participantsCount} isWaitingForPlayers={roundData.participantsCount < 2} />
                    </div>
                  )}
                  <div className="w-full max-w-2xl mx-auto">
                    {!connected ? <WalletMultiButton className="!bg-primary !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !text-black shadow-lg" /> : isParticipant ? (
                      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-[2rem] w-full text-center">
                        <p className="text-primary font-black text-3xl italic tracking-tighter mb-3 uppercase">YOU'RE IN THE GAME!</p>
                      </div>
                    ) : <JoinButton roundId={roundData.round.id} price={Number(roundData.round.price)} userId={user?.id || 0} />}
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div key="active-game" initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: -90 }} transition={{ duration: 0.8 }} className="flex-1 flex flex-col h-full">
              <div className="glass-card neon-border rounded-[3rem] p-6 bg-black/40 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8 shrink-0">
                   <div className="flex items-center gap-4">
                      <Trophy className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-white uppercase font-black tracking-widest text-sm">Prize Pool</p>
                        <p className="text-3xl font-black text-primary italic font-display">{formatCurrency(roundData.round.prizePool)} {PROTOCOL_CONFIG.SYMBOL}</p>
                      </div>
                   </div>
                   <div className="flex gap-3 items-center">
                      {(roundData.round as any).mode === 'PAID' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">100 {PROTOCOL_CONFIG.SYMBOL}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25">
                          <Zap className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Free</span>
                        </div>
                      )}
                      <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <p className="text-white uppercase font-black text-xs tracking-widest">Room</p>
                        <p className="text-2xl font-black text-white">#{roundData.round.id}</p>
                      </div>
                   </div>
                </div>
                {isParticipant && currentCard ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <BingoCard card={currentCard} drawnNumbers={roundData.round.drawnNumbers || []} className="w-full max-w-[520px]" />
                    <BingoClaimButton roundId={roundData.round.id} userId={user?.id || 0} card={currentCard} drawnNumbers={roundData.round.drawnNumbers || []} status={roundData.round.status} isBingoed={(myParticipant as any)?.hasBingo} className="w-full h-16 text-3xl font-black" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-5 px-2">
                    {/* Spectator badge */}
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10">
                      <Globe2 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-black text-primary uppercase tracking-[0.25em]">Spectating Live</span>
                    </div>

                    {/* Drawn number + progress */}
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-white/50 uppercase font-black tracking-widest">Last Called</p>
                      {(roundData.round.drawnNumbers || []).length > 0 ? (
                        <div className="w-20 h-20 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                          <span className="text-4xl font-black text-primary italic">{(roundData.round.drawnNumbers ?? [])[(roundData.round.drawnNumbers ?? []).length - 1]}</span>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-primary/50 animate-spin" />
                        </div>
                      )}
                      <p className="text-xs text-white/40 font-mono mt-1">{(roundData.round.drawnNumbers || []).length} / 75 balls drawn</p>
                    </div>

                    {/* Recent numbers */}
                    {(roundData.round.drawnNumbers || []).length > 1 && (
                      <div className="flex gap-1.5 flex-wrap justify-center max-w-[260px]">
                        {[...(roundData.round.drawnNumbers || [])].reverse().slice(1, 9).map((n: number, i: number) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[11px] font-black text-white/60">
                            {n}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Live leaderboard */}
                    {sortedParticipants.length > 0 && (
                      <div className="w-full max-w-[300px] space-y-1.5">
                        <p className="text-xs text-white/40 uppercase font-black tracking-widest text-center mb-2">Live Standings</p>
                        {sortedParticipants.slice(0, 5).map((p: any, i: number) => (
                          <div key={p.userId || i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs font-black text-primary w-4 shrink-0">#{i + 1}</span>
                            <span className="flex-1 text-xs font-black text-white truncate">{formatAddress(p.username)}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${p.prob || 0}%` }} />
                              </div>
                              <span className="text-xs font-black text-primary w-8 text-right">{Math.round(p.prob || 0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <aside className="lg:col-span-3 h-[750px] flex flex-col">
        <div className="flex-1 h-full glass-card neon-border rounded-[2.5rem] bg-black/40 overflow-hidden p-6 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
            <div className="mt-6 flex-1 min-h-0">
              <GameHistory 
                historyRounds={historyRounds || []} 
                historyLoading={historyLoading} 
                formatAddress={formatAddress} 
                currentRoundHash={roundData.round.publicHash} 
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  const mobileView = (
    <div className="lg:hidden flex flex-col h-[calc(100dvh-140px)] w-full overflow-hidden relative max-h-[580px] my-auto">
      <div className="flex-1 relative overflow-hidden p-3 lg:p-0">
        <AnimatePresence mode="wait">
          {activeTab === "game" && (
            <motion.div key="game" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col space-y-3">
              {roundData.round.status === "OPEN" || roundData.round.status === "STARTING" ? (
                <div className="glass-card neon-border rounded-[2rem] p-4 flex-1 flex flex-col items-center justify-between bg-black/60 overflow-hidden relative">
                  <div className="w-full flex flex-col gap-1.5 z-20 relative">
                    <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-black text-white/80 tracking-widest">Room</p>
                        <p className="text-xl font-black text-white italic">#{roundData.round.id}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-black text-white/80 tracking-widest">Prize</p>
                        <p className="text-xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]">{formatCurrency(roundData.round.prizePool || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-black text-white/80 tracking-widest">Players</p>
                        <p className="text-xl font-black text-white italic">{roundData.participantsCount}</p>
                      </div>
                    </div>
                    {/* Mode badge */}
                    <div className="flex justify-center">
                      {(roundData.round as any).mode === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest">
                          <Coins className="w-2.5 h-2.5" /> 100 {PROTOCOL_CONFIG.SYMBOL} Entry
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
                          <Zap className="w-2.5 h-2.5" /> Free Play
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center py-2 w-full relative">
                    <div className="flex flex-col items-center w-full px-4 mb-4">
                      <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                    </div>
                    <div className="mt-2">
                      <CountdownTimer secondsRemaining={roundData.secondsRemaining} status={roundData.round.status} participantCount={roundData.participantsCount} isWaitingForPlayers={roundData.participantsCount < 2} />
                    </div>
                  </div>

                  <div className="w-full mt-auto">
                    {!connected ? (
                      <div className="flex justify-center w-full">
                        <WalletMultiButton className="!bg-primary !h-12 !w-full !text-black !font-black !rounded-xl" />
                      </div>
                    ) : isParticipant ? (
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl text-center">
                        <p className="text-primary font-black uppercase text-xs">IN GAME STANDBY</p>
                      </div>
                    ) : (
                      <div className="flex justify-center w-full">
                        <JoinButton roundId={roundData.round.id} price={Number(roundData.round.price)} userId={user?.id || 0} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                  <div className="hidden lg:block glass-card neon-border rounded-2xl p-2 lg:p-3 bg-black/40 shrink-0">
                    <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                  </div>
                  <div className="glass-card neon-border rounded-2xl p-3 bg-black/40 flex-1 flex flex-col items-center justify-center min-h-0 relative">
                    <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
                      <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
                    </div>
                    {isParticipant && currentCard ? (
                      <div className="flex flex-col items-center justify-center w-full h-full relative pt-16">
                        <BingoCard card={currentCard} drawnNumbers={roundData.round.drawnNumbers || []} className="scale-[0.7] sm:scale-[0.8] origin-center w-full mb-auto" />
                        <div className="w-full mt-auto">
                          <BingoClaimButton roundId={roundData.round.id} userId={user?.id || 0} card={currentCard} drawnNumbers={roundData.round.drawnNumbers || []} status={roundData.round.status} isBingoed={(myParticipant as any)?.hasBingo} className="h-12 lg:h-14 text-lg lg:text-xl font-black" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-3 px-2 pt-14">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10">
                          <Globe2 className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Spectating Live</span>
                        </div>
                        {/* Last number */}
                        {(roundData.round.drawnNumbers || []).length > 0 ? (
                          <div className="w-14 h-14 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            <span className="text-2xl font-black text-primary italic">{(roundData.round.drawnNumbers ?? [])[(roundData.round.drawnNumbers ?? []).length - 1]}</span>
                          </div>
                        ) : (
                          <Loader2 className="w-8 h-8 text-primary/50 animate-spin" />
                        )}
                        <p className="text-[10px] text-white/40 font-mono">{(roundData.round.drawnNumbers || []).length} / 75 balls</p>
                        {/* Mini leaderboard */}
                        {sortedParticipants.length > 0 && (
                          <div className="w-full space-y-1">
                            {sortedParticipants.slice(0, 4).map((p: any, i: number) => (
                              <div key={p.userId || i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-[10px] font-black text-primary w-4 shrink-0">#{i+1}</span>
                                <span className="flex-1 text-[10px] font-black text-white truncate">{formatAddress(p.username)}</span>
                                <span className="text-[10px] font-black text-primary shrink-0">{Math.round(p.prob || 0)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "players" && (
            <motion.div key="players" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
              <PlayerList participants={sortedParticipants} walletAddress={walletAddress} formatAddress={formatAddress} roundStatus={roundData.round.status} roundData={roundData} />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto">
              <div className="space-y-4 pb-20">
                <GameHistory 
                  historyRounds={historyRounds || []} 
                  historyLoading={historyLoading} 
                  formatAddress={formatAddress} 
                  currentRoundHash={roundData.round.publicHash} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 p-2 z-[60] pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Button variant={activeTab === "game" ? "default" : "ghost"} onClick={() => setActiveTab("game")} className="flex flex-col items-center gap-1 h-16 w-full rounded-xl" data-testid="button-nav-game">
            <Gamepad2 className="w-7 h-7" /> <span className="text-sm font-black uppercase">Game</span>
          </Button>
          <Button variant={activeTab === "players" ? "default" : "ghost"} onClick={() => setActiveTab("players")} className="flex flex-col items-center gap-1 h-16 w-full rounded-xl" data-testid="button-nav-players">
            <Users className="w-7 h-7" /> <span className="text-sm font-black uppercase">Players</span>
          </Button>
          <Button variant={activeTab === "history" ? "default" : "ghost"} onClick={() => setActiveTab("history")} className="flex flex-col items-center gap-1 h-16 w-full rounded-xl" data-testid="button-nav-history">
            <History className="w-7 h-7" /> <span className="text-sm font-black uppercase">History</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-4">
      <ModeSelector selected={selectedMode} onChange={setSelectedMode} />
      {desktopView}
      {mobileView}
      <AnimatePresence>
        {overlayState?.show && (
          <WinnerOverlay
            show={overlayState.show}
            username={overlayState.username}
            prize={overlayState.prize}
            isWinner={overlayState.isWinner}
            isParticipant={overlayState.isParticipant}
            txHash={overlayState.txHash ?? ""}
            onClose={() => setHasManuallyClosed(true)}
            timeLeft={overlayState.timeLeft}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
