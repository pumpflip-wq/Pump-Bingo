import { formatAddress, formatCurrency } from "@/lib/utils";
import { ProbabilityFeed } from "@/components/game/ProbabilityFeed";
import { PlayerList } from "@/components/game/PlayerList";
import { GameHistory } from "@/components/game/GameHistory";
import { useRounds, useRound, useParticipant } from "@/hooks/use-game";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { Users, Trophy, Loader2, History, ShieldCheck, Globe, Copy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Round, type User, type Transaction, ROUND_STATUS } from "@shared/schema";
import { cn } from "@/lib/utils";

import { CountdownTimer } from "@/components/CountdownTimer";
import { JoinButton } from "@/components/JoinButton";
import { BingoClaimButton } from "@/components/BingoClaimButton";
import { BingoCard } from "@/components/BingoCard";

import { useGameState } from "@/hooks/useGameState";

export default function Home() {
  const { 
    user, 
    walletAddress, 
    connected, 
    roundData, 
    latestRound, 
    participant, 
    foundParticipant, 
    isLoading,
    historyRounds,
    historyLoading 
  } = useGameState();
  const { toast } = useToast();

  const currentCard = (participant?.card as number[][] | undefined) || (foundParticipant && typeof foundParticipant === 'object' && 'card' in foundParticipant ? (foundParticipant as any).card as number[][] : undefined);

  const [hasManuallyClosed, setHasManuallyClosed] = useState(false);
  const [lastOverlayRoundId, setLastOverlayRoundId] = useState<number | null>(null);

  const isParticipant = !!participant || !!foundParticipant;

  const calculateWinProb = (card: number[][], drawn: number[]) => {
    const drawnSet = new Set(drawn);
    if (drawnSet.size === 0) return 0;
    
    let minMissing = 5;

    for (let r = 0; r < 5; r++) {
      const rowNumbers = card[r].filter(n => n !== 0);
      const missing = rowNumbers.filter(n => !drawnSet.has(n)).length;
      minMissing = Math.min(minMissing, missing);
    }
    for (let c = 0; c < 5; c++) {
      let missing = 0;
      let totalInCol = 0;
      for (let r = 0; r < 5; r++) {
        const n = card[r][c];
        if (n !== 0) {
          totalInCol++;
          if (!drawnSet.has(n)) missing++;
        }
      }
      if (totalInCol > 0) minMissing = Math.min(minMissing, missing);
    }
    let d1Missing = 0, d1Total = 0;
    let d2Missing = 0, d2Total = 0;
    for (let i = 0; i < 5; i++) {
      if (card[i][i] !== 0) {
        d1Total++;
        if (!drawnSet.has(card[i][i])) d1Missing++;
      }
      if (card[i][4-i] !== 0) {
        d2Total++;
        if (!drawnSet.has(card[i][4-i])) d2Missing++;
      }
    }
    if (d1Total > 0) minMissing = Math.min(minMissing, d1Missing);
    if (d2Total > 0) minMissing = Math.min(minMissing, d2Missing);

    if (minMissing === 0) return 100;
    
    const drawnCount = drawn.length;
    const baseProgress: Record<number, number> = {
      5: Math.min(10, (drawnCount / 75) * 20),
      4: 10 + Math.min(20, (drawnCount / 75) * 40),
      3: 30 + Math.min(30, (drawnCount / 75) * 60),
      2: 60 + Math.min(25, (drawnCount / 75) * 50),
      1: 85 + Math.min(14, (drawnCount / 75) * 30)
    };
    
    return Math.floor(baseProgress[minMissing] ?? 0);
  };

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [lastWinKey, setLastWinKey] = useState<string | null>(null);

  const overlayState = useMemo(() => {
    const hasWinner = !!roundData?.round.winnerId;
    const currentRoundId = roundData?.round.id;
    const winnerDeclaredAt = roundData?.round.completedAt ? new Date(roundData.round.completedAt).getTime() : null;

    // Reset manual close state only when a NEW round starts (Lobby transition)
    if (currentRoundId && currentRoundId !== lastOverlayRoundId) {
      setLastOverlayRoundId(currentRoundId);
      setHasManuallyClosed(false);
      setLastWinKey(null);
    }

    const winKey = hasWinner ? `${currentRoundId}_win` : null;
    
    // Check winKey but ensure it's not already closed manually for THIS win
    if (winKey && winKey !== lastWinKey) {
      setLastWinKey(winKey);
      setHasManuallyClosed(false);
    }

    // Don't show if manually closed
    if (hasManuallyClosed) {
      return null;
    }

    if (hasWinner && winnerDeclaredAt) {
      const elapsed = currentTime - winnerDeclaredAt;
      const totalDisplayTime = 10000; // Total display time for the overlay
      const remaining = Math.max(0, Math.floor((totalDisplayTime - elapsed) / 1000));
      
      // Stop showing if timer expired - ensure clean exit
      if (remaining < 0 || elapsed > 10500) {
        // Do not update state in useMemo
        return null;
      }

      const isMe = roundData.round.winnerId === user?.id;
      // Search in participants for the winner
      const winner = roundData.participants?.find((p: any) => p.userId === roundData.round.winnerId || p.id === roundData.round.winnerId);
      const winnerUsername = winner?.username || (isMe ? walletAddress : (roundData.round.winnerId?.toString() || "Unknown"));
      
      return {
        show: true,
        username: winnerUsername,
        prize: roundData.round.prizePool || 0,
        isWinner: isMe,
        txHash: (roundData.round as any).txHash,
        timeLeft: remaining,
        currentRoundId: currentRoundId // Added to help track state changes
      };
    }

    return null;
  }, [roundData, user?.id, walletAddress, hasManuallyClosed, lastOverlayRoundId, currentTime, lastWinKey]);

  useEffect(() => {
    const isRoundFinished = roundData?.round.status === 'FINISHED';
    const hasWinner = !!roundData?.round.winnerId;
    
    if (isRoundFinished || hasWinner) {
      const winnerDeclaredAt = roundData.round.completedAt ? new Date(roundData.round.completedAt).getTime() : null;
      if (winnerDeclaredAt) {
        const elapsed = currentTime - winnerDeclaredAt;
        // The overlay should stay up for exactly 10s. 
        // Once elapsed hits 10s, we mark it as closed to prevent double triggers
        // We use a small buffer to ensure we only trigger once
        if (elapsed >= 10000 && !hasManuallyClosed && lastOverlayRoundId !== roundData.round.id) {
          setHasManuallyClosed(true);
          setLastOverlayRoundId(roundData.round.id);
        }
      }
    } else {
      // Reset manual close when a new round starts
      if (lastOverlayRoundId !== null && roundData?.round.id !== lastOverlayRoundId) {
        setHasManuallyClosed(false);
      }
    }
  }, [roundData?.round.status, roundData?.round.winnerId, roundData?.round.completedAt, roundData?.round.id, currentTime, hasManuallyClosed, lastOverlayRoundId]);

  const nextRoundTimer = useMemo(() => {
    if ((roundData?.round.status === 'FINISHED' || roundData?.round.winnerId) && roundData.round.completedAt) {
      const completedAt = new Date(roundData.round.completedAt).getTime();
      const elapsed = currentTime - completedAt;
      return Math.max(0, Math.ceil((10000 - elapsed) / 1000));
    }
    return 0;
  }, [roundData?.round.status, roundData?.round.winnerId, roundData?.round.completedAt, currentTime]);

  const sortedParticipants = useMemo(() => {
    if (!roundData?.participants) return [];
    
    const withProb = roundData.participants.map(p => ({
      ...p,
      prob: calculateWinProb(p.card, roundData.round.drawnNumbers || [])
    }));

    // If I'm not a participant, don't sort the list by probability for the sidebar
    // This keeps the sidebar stable for spectators while they see the dynamic ranking in the center
    if (!isParticipant) {
      return withProb;
    }

    return withProb.sort((a, b) => b.prob - a.prob);
  }, [roundData?.participants, roundData?.round.drawnNumbers, isParticipant]);

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="flex-1 flex flex-col space-y-4">
            {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">Connecting Node...</p>
            </div>
          ) : latestRound && roundData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
              
            <aside className="lg:col-span-3 space-y-4 flex flex-col h-[750px]">
              <PlayerList 
                participants={[
                  ...(walletAddress && sortedParticipants.some(p => p.username === walletAddress) 
                    ? [] 
                    : (walletAddress && (participant || foundParticipant) ? [{ id: 'me', username: walletAddress, prob: 0 }] : [])),
                  ...sortedParticipants
                ]}
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
                                <span className="text-7xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">{formatCurrency(roundData.round.prizePool || 0)}</span>
                                <span className="text-3xl text-primary font-black uppercase tracking-widest mt-1">{PROTOCOL_CONFIG.SYMBOL}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">Players</p>
                              <p className="text-5xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-10 bg-black/60 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden w-full max-w-2xl my-auto">
                          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                          <p className="text-white text-xl uppercase font-black tracking-[0.2em] mb-6 font-mono">
                            {roundData.round.status === 'STARTING' ? 'SECURING GAME PROTOCOL...' : 
                             roundData.participantsCount < 2 ? 'WAITING FOR CHALLENGERS...' : 'GAME STARTING IN'}
                          </p>
                          <CountdownTimer 
                            targetDate={roundData.round.startTime?.toString() || null} 
                            status={roundData.round.status}
                            participantCount={roundData.participantsCount}
                          />
                          {roundData.participantsCount < 2 && (
                            <div className="space-y-2 mt-6">
                              <p className="text-primary text-lg uppercase font-black animate-pulse tracking-widest font-display">
                                Waiting for Players...
                              </p>
                              <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em]">
                                Minimum 2 participants required to launch the round
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="w-full max-w-md mx-auto mb-2">
                          {!connected ? (
                            <div className="space-y-6">
                              <p className="text-white text-sm uppercase font-black tracking-widest italic">Connect Wallet to Start</p>
                              <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !italic !tracking-tighter !text-black shadow-lg" />
                            </div>
                          ) : participant || foundParticipant ? (
                            <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                              <p className="text-primary font-black text-3xl italic tracking-tighter mb-2 uppercase text-center">YOU'RE IN THE GAME!</p>
                              <div className="space-y-1">
                                <p className="text-sm text-primary/90 uppercase font-black tracking-widest text-center whitespace-nowrap">CARD SECURED • ENTRY PAID</p>
                                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center">Your card will automatically activate when the round begins</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <JoinButton roundId={roundData.round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center">JOIN BEFORE GAME STARTS</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="game"
                      initial={{ opacity: 0, rotateY: -90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: 90 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="space-y-4 flex-1 overflow-hidden h-full flex flex-col"
                    >
                      <div className="glass-card neon-border rounded-xl p-6 flex flex-row items-center justify-between bg-black/60 border-primary/30 shrink-0">
                        <div className="flex flex-col">
                          <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-1">Prize Pool</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">{formatCurrency(roundData.round.prizePool || 0)} {PROTOCOL_CONFIG.SYMBOL}</span>
                          </div>
                        </div>
                        <div className="flex gap-16">
                          <div className="text-center">
                            <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-1">Room</p>
                            <p className="text-5xl font-black text-white font-display italic leading-none">#{roundData.round.id}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-1">Players</p>
                            <p className="text-5xl font-black text-white font-display italic leading-none">{roundData.participantsCount}</p>
                          </div>
                        </div>
                      </div>
                          {isParticipant && currentCard && roundData.round.status !== 'FINISHED' && !roundData.round.winnerId ? (
                            <div className="relative space-y-4 flex flex-col items-center flex-1 min-h-0 justify-center w-full">
                                <BingoCard 
                                card={currentCard} 
                                drawnNumbers={roundData.round.drawnNumbers || []} 
                                className="w-full max-w-[520px] scale-100"
                              />
                              <div className="flex justify-center w-full max-w-[520px] shrink-0">
                                <BingoClaimButton 
                                  roundId={roundData.round.id} 
                                  userId={user?.id || 0} 
                                  card={currentCard}
                                  drawnNumbers={roundData.round.drawnNumbers || []}
                                  status={roundData.round.status}
                                  isBingoed={participant?.hasBingo || false}
                                  className="w-full h-16 text-3xl font-black italic tracking-tighter"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="glass-card neon-border rounded-[3rem] p-8 min-h-[500px] flex flex-col items-center justify-center space-y-8 relative overflow-hidden flex-1 w-full">
                              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                              <div className="text-center space-y-4 relative z-10">
                                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                  <Globe className="w-3 h-3 animate-spin-slow" /> {roundData.round.winnerId || roundData.round.status === 'FINISHED' ? 'ROUND COMPLETED' : 'Live Feed Active'}
                                </div>
                                <h2 className="text-5xl md:text-7xl font-black font-display italic text-white tracking-tighter uppercase">
                                  {roundData.round.winnerId || roundData.round.status === 'FINISHED' ? (
                                    <div className="flex flex-col items-center gap-6">
                                      <span className="text-primary animate-pulse text-5xl md:text-7xl">BINGO! ROUND WON</span>
                                      <div className="bg-primary/10 border border-primary/30 rounded-[2rem] p-8 w-full max-w-3xl shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                                        <p className="text-lg text-white uppercase font-black tracking-[0.4em] mb-8 text-center border-b border-white/10 pb-4">ROUND STATISTICS</p>
                                        <div className="space-y-10">
                                          <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm text-white/80 uppercase font-black tracking-widest">🏆 WINNING PLAYER</span>
                                            <span className="text-2xl md:text-5xl font-black text-white italic tracking-tighter truncate max-w-full px-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                              {formatAddress(roundData.participants?.find((p: any) => p.userId === roundData.round.winnerId || p.id === roundData.round.winnerId)?.username || "Unknown")}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-center gap-2">
                                            <span className="text-sm text-white/80 uppercase font-black tracking-widest">💰 TOTAL REWARD</span>
                                            <span className="text-4xl md:text-7xl font-black text-primary italic leading-none drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                                              {formatCurrency(roundData.round.prizePool || 0)} <span className="text-2xl">PBINGO</span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      {roundData.round.completedAt && (
                                        <div className="flex flex-col items-center gap-2">
                                          <span className="text-white font-black text-2xl uppercase tracking-[0.4em] animate-pulse">NEXT ROUND IN {nextRoundTimer}S</span>
                                          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: "100%" }}
                                              animate={{ width: `${(nextRoundTimer / 10) * 100}%` }}
                                              className="h-full bg-primary"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : 'WATCHING LIVE'}
                                </h2>
                                  {!roundData.round.winnerId && roundData.round.status !== 'FINISHED' && (
                                  <div className="flex flex-col w-full max-w-xl mx-auto mt-4 h-[450px]">
                                    <div className="flex flex-col items-center shrink-0 mb-6">
                                      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                        <Globe className="w-3 h-3 animate-spin-slow" /> SPECTATOR MODE ACTIVE
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col flex-1 min-h-0 bg-black/20 rounded-2xl border border-white/5 p-4">
                                      <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                                        <p className="text-white text-xs font-black uppercase tracking-[0.3em]">Live Player Rankings</p>
                                        <Users className="w-4 h-4 text-primary/40" />
                                      </div>
                                      
                                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                        {sortedParticipants.map((p, idx) => (
                                          <div key={p.id || idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group transition-all duration-300 hover:border-primary/30">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                                {idx + 1}
                                              </div>
                                              <span className="font-mono text-base text-white font-bold truncate max-w-[150px]">
                                                {formatAddress(p.username)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-6 shrink-0">
                                              <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden hidden sm:block border border-white/5">
                                                <motion.div 
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${p.prob}%` }}
                                                  className="h-full bg-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                                                />
                                              </div>
                                              <span className="font-mono text-lg font-black text-primary w-[4ch] text-right">
                                                {Math.round(p.prob)}%
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                        
                                        {sortedParticipants.length === 0 && (
                                          <div className="flex flex-col items-center justify-center h-full py-12 opacity-20">
                                            <Users className="w-12 h-12 mb-4" />
                                            <p className="text-xs font-black uppercase tracking-widest">Waiting for players...</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="w-full max-w-md mx-auto mb-2">
                                {(roundData.round.status === 'OPEN' || roundData.round.status === 'STARTING') && (
                                  <JoinButton roundId={roundData.round.id} price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE} userId={user?.id || 0} />
                                )}
                              </div>
                            </div>
                          )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>

            <aside className="lg:col-span-3 flex flex-col h-[750px]">
              <div className="glass-card neon-border rounded-2xl p-6 flex flex-col shrink-0 bg-black/40 border-primary/20 mb-4">
                <LastCalledNumber numbers={roundData.round.drawnNumbers || []} />
              </div>
              <GameHistory 
                historyRounds={historyRounds}
                historyLoading={historyLoading}
                formatAddress={formatAddress}
              />
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
      {overlayState && (
        <WinnerOverlay 
          show={overlayState.show} 
          username={overlayState.username || "Unknown"} 
          prize={overlayState.prize}
          isWinner={overlayState.isWinner}
          timeLeft={overlayState.timeLeft}
          txHash={overlayState.txHash}
          onClose={() => setHasManuallyClosed(true)}
        />
      )}
    </>
  );
}
