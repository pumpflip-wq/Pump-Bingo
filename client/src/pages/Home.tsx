import { api } from "@shared/routes";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { PlayerList } from "@/components/game/PlayerList";
import { GameHistory } from "@/components/game/GameHistory";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, Globe, ShieldCheck, AlertTriangle, Globe2, Shield, History, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ROUND_STATUS } from "@shared/schema";
import { CountdownTimer } from "@/components/CountdownTimer";
import { JoinButton } from "@/components/JoinButton";
import { BingoClaimButton } from "@/components/BingoClaimButton";
import { BingoCard } from "@/components/BingoCard";
import { useGameState } from "@/hooks/useGameState";
// import { DrawnNumbers } from "@/components/game/DrawnNumbers";

export default function Home() {
  const { 
    user, 
    walletAddress, 
    connected, 
    roundData, 
    latestRound, 
    isLoading,
    error,
    historyRounds,
    historyLoading 
  } = useGameState();

  // Find MY participant entry correctly
  const myParticipant = useMemo(() => {
    if (!walletAddress || !roundData?.participants) return null;
    return roundData.participants.find((p: any) => p.username === walletAddress);
  }, [walletAddress, roundData?.participants]);

  const [hasManuallyClosed, setHasManuallyClosed] = useState(false);
  const [lastOverlayRoundId, setLastOverlayRoundId] = useState<number | null>(null);
  const completionTimeRef = useRef<{ roundId: number; time: number } | null>(null);

  // Set completionTimeRef when a winner is declared
  useEffect(() => {
    const currentRoundId = roundData?.round?.id;
    const hasWinner = !!roundData?.round?.winnerId;
    const roundStatus = roundData?.round?.status;
    
    // When winner is declared (status COMPLETED or has winnerId), record the time
    if (hasWinner && currentRoundId) {
      // Only set if it's a new round or not yet set
      if (!completionTimeRef.current || completionTimeRef.current.roundId !== currentRoundId) {
        completionTimeRef.current = { roundId: currentRoundId, time: Date.now() };
        setHasManuallyClosed(false); // Reset manual close for new round
      }
    }
    
    // Reset when moving to a new round that doesn't have a winner
    if (currentRoundId && !hasWinner && completionTimeRef.current?.roundId !== currentRoundId) {
      completionTimeRef.current = null;
      setHasManuallyClosed(false);
    }
  }, [roundData?.round?.id, roundData?.round?.winnerId, roundData?.round?.status]);

  const currentCard = (myParticipant?.card as number[][] | undefined);

  const isParticipant = !!myParticipant;

  const calculateWinProbLocal = (card: number[][], drawn: number[]) => {
    const drawnSet = new Set(drawn);
    drawnSet.add(0); // Free space
    if (drawn.length <= 1) return 0;
    const lines = [
      ...Array(5).fill(0).map((_, r) => card[r]),
      ...Array(5).fill(0).map((_, c) => card.map(r => r[c])),
      Array(5).fill(0).map((_, i) => card[i][i]),
      Array(5).fill(0).map((_, i) => card[i][4 - i])
    ];
    let maxMarked = 0;
    let potentialLines = 0;
    let totalMarked = 0;
    lines.forEach(line => {
      const marked = line.filter(n => drawnSet.has(n)).length;
      if (marked > maxMarked) maxMarked = marked;
      if (marked === 4) potentialLines++;
    });
    card.flat().forEach(num => { if (num !== 0 && drawnSet.has(num)) totalMarked++; });
    if (maxMarked === 5) return 100;
    if (totalMarked >= 1 && drawn.length > 0) {
      const hitDensity = (totalMarked / 24) * 15; 
      let baseLineProb = 0;
      if (maxMarked === 2) baseLineProb = 5;
      else if (maxMarked === 3) baseLineProb = 20;
      else if (maxMarked === 4) baseLineProb = 50;
      const proximityBonus = potentialLines * 12;
      const gameProgress = (drawn.length / 75) * 10;
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

  const participantsList = useMemo(() => {
    if (!roundData?.participants) return [];
    return (roundData.participants as any[])
      .filter(p => !p.txSignature?.startsWith('TEST_TX_SIG_') && p.username !== PROTOCOL_CONFIG.ADMIN_WALLET)
      .map(p => ({
        ...p,
        prob: p.finalWinProb || calculateWinProbLocal(p.card, roundData.round.drawnNumbers || [])
      }));
  }, [roundData?.participants, roundData?.round?.drawnNumbers]);

  const sortedParticipants = useMemo(() => {
    return [...participantsList].sort((a, b) => b.prob - a.prob);
  }, [participantsList]);

  const overlayState = useMemo(() => {
    const hasWinner = !!roundData?.round.winnerId;
    const winnerDeclaredAt = completionTimeRef.current?.time;
    const currentRoundId = roundData?.round.id;
    const isMe = roundData?.round.winnerId === user?.id;
    const isFinished = roundData?.round.status === ROUND_STATUS.FINISHED;
    const amIParticipant = isParticipant;

    if (hasManuallyClosed || !winnerDeclaredAt || !roundData) return null;
    const elapsed = currentTime - winnerDeclaredAt;
    const totalDisplayTime = 10000; 
    if (elapsed >= totalDisplayTime) return null;

    const winner = roundData.participants?.find((p: any) => p.userId === roundData.round.winnerId || p.id === roundData.round.winnerId);
    const winnerUsername = winner?.username || (isMe ? walletAddress : (roundData.round.winnerId?.toString() || "Unknown"));
    
    return {
      show: true,
      username: winnerUsername || "Unknown",
      prize: roundData.round.prizePool || 0,
      isWinner: isMe,
      isParticipant: amIParticipant,
      txHash: roundData.round.payoutSignature || undefined,
      timeLeft: Math.max(0, Math.floor((totalDisplayTime - elapsed) / 1000)),
      currentRoundId: currentRoundId
    };
  }, [roundData, user?.id, walletAddress, hasManuallyClosed, currentTime, isParticipant]);

  const nextRoundTimer = useMemo(() => {
    const completionTime = completionTimeRef.current?.time;
    if (completionTime) {
      const elapsed = currentTime - completionTime;
      return Math.max(0, Math.ceil((10000 - elapsed) / 1000));
    }
    return 0;
  }, [roundData?.round?.id, currentTime]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1 text-center">
          <AlertTriangle className="w-16 h-16 text-destructive animate-pulse" />
          <p className="font-mono text-xs text-destructive uppercase tracking-[0.3em]">System Link Failure</p>
          <p className="text-white/60 text-sm max-w-md italic uppercase font-black tracking-widest">Database connection failure</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 font-black italic uppercase">Reconnect Protocol</Button>
        </div>
      );
    }
    if (latestRound && roundData) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          <aside className="lg:col-span-3 space-y-4 flex flex-col h-[750px]">
            <PlayerList 
              participants={participantsList}
              walletAddress={walletAddress}
              formatAddress={formatAddress}
              roundStatus={roundData.round.status}
              roundData={roundData}
            />
          </aside>
          <main className="lg:col-span-6 space-y-4 h-[750px] flex flex-col overflow-hidden relative" style={{ perspective: "1000px" }}>
            <AnimatePresence mode="wait">
              {roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING' ? (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="glass-card neon-border rounded-[3rem] p-8 text-center flex flex-col items-center justify-between min-h-0 h-full relative overflow-hidden shrink-0"
                >
                  <div className="flex-1 flex flex-col items-center justify-between py-4 w-full h-full">
                    <div className="w-full space-y-8">
                      <div className="glass-card neon-border rounded-2xl p-8 bg-black/60 border-primary/30 flex flex-row items-center justify-center gap-24 w-full">
                        <div className="flex flex-col text-center">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Room</p>
                          <p className="text-5xl font-black text-white font-display italic leading-none">#{roundData.round.id}</p>
                        </div>
                        <div className="flex flex-col text-center scale-110">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Prize Pool</p>
                          <div className="flex flex-col items-center">
                            <span className="text-7xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                              {formatCurrency(roundData.round.prizePool || 0)}
                            </span>
                            <span className="text-3xl text-primary font-black uppercase tracking-widest mt-1">{PROTOCOL_CONFIG.SYMBOL}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Players</p>
                          <p className="text-5xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-4 px-8 bg-black/60 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden w-full max-w-2xl my-auto flex flex-col justify-center items-center">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                      <p className="text-white text-sm uppercase font-black tracking-[0.2em] mb-1 font-mono">
                        {roundData.round.status === 'STARTING' ? 'SECURING GAME PROTOCOL...' : 'GAME STARTING IN'}
                      </p>
                      <CountdownTimer secondsRemaining={roundData.secondsRemaining} status={roundData.round.status} participantCount={roundData.participantsCount} isWaitingForPlayers={(roundData as any).isWaitingForPlayers || roundData.participantsCount < 2} />
                      {roundData.participantsCount < 2 && (
                        <div className="space-y-0 mt-2 text-center">
                          <p className="text-primary text-base uppercase font-black animate-pulse tracking-[0.15em] font-display">
                            Waiting for Players...
                          </p>
                          <p className="text-[11px] text-white uppercase font-black tracking-[0.1em] opacity-90">
                            Minimum 2 participants required to start
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="w-full max-w-2xl mx-auto mb-2">
                      {!connected ? (
                        <div className="space-y-6">
                          <p className="text-white text-sm uppercase font-black tracking-widest italic">Connect Wallet to Start</p>
                          <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !italic !tracking-tighter !text-black shadow-lg" />
                        </div>
                      ) : isParticipant ? (
                        <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-[2rem] shadow-[0_0_30px_rgba(34,197,94,0.1)] w-full">
                          <p className="text-primary font-black text-3xl italic tracking-tighter mb-3 uppercase text-center">YOU'RE IN THE GAME!</p>
                          <p className="text-sm text-white uppercase font-black tracking-widest text-center opacity-90">CARD ACTIVATES AUTOMATICALLY ON START</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <JoinButton roundId={roundData.round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                          <p className="text-[12px] text-white uppercase font-black tracking-[0.2em] text-center opacity-80">JOIN BEFORE GAME STARTS</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="active-game"
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="flex-1 flex flex-col min-h-0 h-full"
                >
                  <div className="flex flex-col space-y-4 flex-1 min-h-0 h-full">
                    <div className="glass-card neon-border rounded-[3rem] p-6 relative overflow-hidden bg-black/40 flex-1 flex flex-col min-h-0 h-full">
                      <div className="flex items-center justify-between mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Prize Pool</p>
                            <p className="text-2xl font-black text-primary italic font-display">{formatCurrency(roundData.round.prizePool)} ${PROTOCOL_CONFIG.SYMBOL}</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-right">
                            <p className="text-[8px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">Room</p>
                            <p className="text-2xl font-black text-white font-display italic leading-none">#{roundData.round.id}</p>
                          </div>
                          <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-right">
                            <p className="text-[8px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">Players</p>
                            <p className="text-2xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                          </div>
                        </div>
                      </div>
                      {isParticipant && currentCard && roundData?.round?.status !== 'FINISHED' && !roundData?.round?.winnerId ? (
                        <div className="relative space-y-4 flex flex-col items-center flex-1 min-h-0 justify-center w-full">
                          <BingoCard card={currentCard} drawnNumbers={roundData?.round?.drawnNumbers || []} className="w-full max-w-[520px] scale-100" />
                          <div className="flex justify-center w-full max-w-[520px] shrink-0">
                            <BingoClaimButton roundId={roundData?.round?.id || 0} userId={user?.id || 0} card={currentCard} drawnNumbers={roundData?.round?.drawnNumbers || []} status={roundData?.round?.status || ROUND_STATUS.OPEN} isBingoed={(myParticipant as any)?.hasBingo || false} className="w-full h-16 text-3xl font-black italic tracking-tighter" />
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card neon-border rounded-[3rem] p-8 min-h-[500px] flex flex-col items-center justify-center space-y-8 relative overflow-hidden flex-1 w-full">
                          <div className="text-center space-y-4 relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                              <Globe className="w-3 h-3 animate-spin-slow" /> Live Feed Active
                            </div>
                            <h2 className="text-6xl font-black text-white italic tracking-tighter uppercase font-display leading-none">Watching <span className="text-primary">Live</span></h2>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-[8px] font-black uppercase tracking-[0.2em]">
                              <ShieldCheck className="w-2.5 h-2.5" /> Spectator Mode Active
                            </div>
                          </div>
                          <div className="w-full max-w-sm space-y-4 relative z-10">
                            <div className="flex items-center justify-between px-2 mb-2">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Live Player Rankings</h4>
                              <Users className="w-3 h-3 text-primary/40" />
                            </div>
                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                              {sortedParticipants.filter(p => !p.txSignature?.startsWith('TEST_TX_SIG_')).slice(0, 5).map((p, idx) => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-[10px] font-black text-primary/60 group-hover:text-primary">{idx + 1}</span>
                                    <span className="text-sm font-black text-white/80 group-hover:text-white truncate max-w-[120px]">{formatAddress(p.username)}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="w-24 h-1.5 rounded-full bg-black/40 overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.prob}%` }} className="h-full bg-primary" />
                                    </div>
                                    <span className="text-xs font-black text-primary font-mono">{Math.round(p.prob)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {overlayState && (
              <WinnerOverlay
                show={overlayState.show}
                onClose={() => setHasManuallyClosed(true)}
                username={overlayState.username}
                prize={overlayState.prize}
                isWinner={overlayState.isWinner}
                isParticipant={overlayState.isParticipant}
                txHash={overlayState.txHash}
                timeLeft={overlayState.timeLeft}
              />
            )}
          </main>
          <aside className="lg:col-span-3 flex flex-col h-[750px]">
            <div className="glass-card neon-border rounded-2xl p-6 flex flex-col shrink-0 bg-black/40 border-primary/20 mb-4">
              <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
            </div>
            <GameHistory 
              historyRounds={historyRounds} 
              historyLoading={historyLoading} 
              formatAddress={formatAddress} 
              currentRoundHash={roundData.round.publicHash}
            />
          </aside>
        </div>
      );
    }
    return null;
  }, [isLoading, error, latestRound, roundData, participantsList, sortedParticipants, isParticipant, currentCard, myParticipant, user, walletAddress, historyRounds, historyLoading, formatAddress, formatCurrency, nextRoundTimer, overlayState, hasManuallyClosed]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex-1 flex flex-col space-y-4">
        {content}
      </div>
    </div>
  );
}
