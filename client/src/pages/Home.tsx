import { formatAddress, formatCurrency } from "@/lib/utils";
import { PlayerList } from "@/components/game/PlayerList";
import { GameHistory } from "@/components/game/GameHistory";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import {
  Users,
  Loader2,
  Globe,
  AlertTriangle,
  Trophy,
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
    error,
    historyRounds,
    historyLoading,
    refetch,
  } = useGameState();

  // Force refetch more frequently to keep UI in sync
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 500); // Poll every 500ms
    return () => clearInterval(interval);
  }, [refetch]);

  // IMPORTANT: No local timer - use server-provided timing data
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [lastOverlayRoundId, setLastOverlayRoundId] = useState<number | null>(
    null,
  );
  const [hasManuallyClosed, setHasManuallyClosed] = useState(false);
  const completionTimeRef = useRef<{ roundId: number; time: number } | null>(
    null,
  );

  // If we have any round data at all, even with an error, don't show the error screen
  const hasData = !!roundData?.round;
  const showErrorMessage = error && !hasData;

  const currentCard =
    (participant?.card as number[][] | undefined) ||
    (foundParticipant &&
    typeof foundParticipant === "object" &&
    "card" in foundParticipant
      ? ((foundParticipant as any).card as number[][])
      : undefined);

  // Server-provided timer for next round
  const nextRoundSecondsRemaining =
    (roundData as any)?.nextRoundSecondsRemaining ?? 0;

  // Use server-provided timer - no local calculation
  const nextRoundTimer = nextRoundSecondsRemaining;

  // Stabilize completion time to prevent restarts on refetch
  if (roundData?.round?.winnerId && roundData?.round?.completedAt) {
    if (completionTimeRef.current?.roundId !== roundData.round.id) {
      completionTimeRef.current = {
        roundId: roundData.round.id,
        time: new Date(roundData.round.completedAt).getTime(),
      };
      setHasManuallyClosed(false);
    }
  }

  // Handle the end of the overlay display
  useEffect(() => {
    if (showWinnerOverlay && nextRoundSecondsRemaining <= 0) {
      setShowWinnerOverlay(false);
      // Refresh to see the new round after overlay is done
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
    }
  }, [showWinnerOverlay, nextRoundSecondsRemaining]);

  const calculateWinProb = (card: number[][], drawn: number[]) => {
    const drawnSet = new Set(drawn);
    drawnSet.add(0); // Free space

    if (drawn.length <= 1) return 0;

    const lines = [
      ...Array(5)
        .fill(0)
        .map((_, r) => card[r]),
      ...Array(5)
        .fill(0)
        .map((_, c) => card.map((r) => r[c])),
      Array(5)
        .fill(0)
        .map((_, i) => card[i][i]),
      Array(5)
        .fill(0)
        .map((_, i) => card[i][4 - i]),
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
      const hitDensity = (totalMarked / 24) * 15;
      let baseLineProb = 0;
      if (maxMarked === 2) baseLineProb = 5;
      else if (maxMarked === 3) baseLineProb = 20;
      else if (maxMarked === 4) baseLineProb = 50;

      const proximityBonus = potentialLines * 12;
      const gameProgress = (drawn.length / 75) * 10;

      const finalProb = Math.min(
        99,
        Math.floor(baseLineProb + hitDensity + proximityBonus + gameProgress),
      );
      return Math.max(1, finalProb);
    }

    return 0;
  };

  const overlayState = useMemo(() => {
    const winnerDeclaredAt = completionTimeRef.current?.time;
    const currentRoundId = roundData?.round?.id;

    const isMe = roundData?.round?.winnerId === user?.id;
    const isFinished = roundData?.round?.status === ROUND_STATUS.FINISHED;
    const isParticipantOfRound = roundData?.participants?.some(
      (p: any) => p.userId === user?.id,
    );

    // Determine if we should show the overlay
    // It should only show for participants of the actual round that just finished
    if (!winnerDeclaredAt || hasManuallyClosed) {
      return null;
    }

    // Use server-provided timer - if 0, the overlay display time has expired
    if (nextRoundSecondsRemaining <= 0) {
      return null;
    }

    const winner = roundData?.participants?.find(
      (p: any) =>
        p.userId === roundData.round.winnerId ||
        p.id === roundData.round.winnerId,
    );
    const winnerUsername =
      winner?.username ||
      (isMe
        ? walletAddress
        : roundData?.round?.winnerId?.toString() || "Unknown");

    return {
      show: true,
      username: winnerUsername,
      prize: roundData?.round?.prizePool || 0,
      isWinner: isMe,
      isParticipant: isParticipantOfRound,
      txHash: roundData?.round?.payoutSignature || undefined,
      timeLeft: nextRoundSecondsRemaining,
      currentRoundId: currentRoundId,
    };
  }, [
    roundData,
    user?.id,
    walletAddress,
    showWinnerOverlay,
    nextRoundSecondsRemaining,
    hasManuallyClosed,
  ]);

  const isParticipant = (!!participant || !!foundParticipant) && !!currentCard;

  const participantsList = useMemo(() => {
    if (!roundData?.participants) return [];
    return roundData.participants.map((p: any) => ({
      ...p,
      prob: calculateWinProb(p.card, roundData?.round?.drawnNumbers || []),
    }));
  }, [roundData?.participants, roundData?.round?.drawnNumbers]);

  const sortedParticipants = useMemo(() => {
    return [...participantsList].sort((a, b) => b.prob - a.prob);
  }, [participantsList]);

  return (
    <>
      <WinnerOverlay
        show={overlayState?.show || false}
        username={overlayState?.username || ""}
        prize={overlayState?.prize || 0}
        isWinner={overlayState?.isWinner || false}
        isParticipant={overlayState?.isParticipant || false}
        timeLeft={overlayState?.timeLeft || 0}
        txHash={overlayState?.txHash}
        onClose={() => setHasManuallyClosed(true)}
      />
      <div className="flex flex-col w-full">
        <div className="flex-1 flex flex-col space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1 text-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">
                Connecting Node...
              </p>
            </div>
          ) : showErrorMessage ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 flex-1 text-center">
              <AlertTriangle className="w-16 h-16 text-destructive animate-pulse" />
              <p className="font-mono text-xs text-destructive uppercase tracking-[0.3em]">
                System Link Failure
              </p>
              <p className="text-white/60 text-sm max-w-md italic uppercase font-black tracking-widest">
                Database connection could not be established
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-4 font-black italic uppercase"
              >
                Reconnect Protocol
              </Button>
            </div>
          ) : latestRound && roundData ? (
            <div className="grid lg:grid-cols-12 gap-4">
              <aside className="lg:col-span-3 space-y-4 flex flex-col h-[750px]">
                <PlayerList
                  participants={participantsList}
                  walletAddress={walletAddress}
                  formatAddress={formatAddress}
                  roundStatus={roundData.round.status}
                  roundData={roundData}
                />
                
                <div className="glass-card neon-border rounded-2xl bg-black/60 border-primary/30 p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <p className="text-white text-xs font-black uppercase tracking-[0.3em]">
                      Game Activity
                    </p>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col min-h-0 space-y-4">
                    <div className="shrink-0">
                      <LastCalledNumber
                        numbers={roundData.round.drawnNumbers || []}
                      />
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <GameHistory
                        rounds={historyRounds}
                        isLoading={historyLoading}
                        formatCurrency={formatCurrency}
                        formatAddress={formatAddress}
                      />
                    </div>
                  </div>
                </div>
              </aside>

              <main
                className="lg:col-span-9 space-y-4 h-[750px] flex flex-col overflow-hidden relative"
                style={{ perspective: "1000px" }}
              >
                <AnimatePresence mode="wait">
                  {roundData.round.status === "OPEN" ||
                  roundData.round.status === "STARTING" ? (
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
                              <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">
                                Room
                              </p>
                              <p className="text-5xl font-black text-white font-display italic leading-none">
                                #{roundData.round.id}
                              </p>
                            </div>
                            <div className="flex flex-col text-center scale-110">
                              <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">
                                Prize Pool
                              </p>
                              <div className="flex flex-col items-center">
                                <span className="text-7xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                                  {formatCurrency(
                                    roundData.round.prizePool || 0,
                                  )}
                                </span>
                                <span className="text-3xl text-primary font-black uppercase tracking-widest mt-1">
                                  {PROTOCOL_CONFIG.SYMBOL}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <p className="text-xl text-white uppercase font-black tracking-widest font-mono mb-2">
                                Players
                              </p>
                              <p className="text-5xl font-black text-white font-display italic leading-none">
                                {roundData.participantsCount}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="py-6 px-10 bg-black/60 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden w-full max-w-2xl my-auto min-h-[190px] flex flex-col justify-center">
                          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                          <p className="text-white text-base uppercase font-black tracking-[0.2em] mb-3 font-mono">
                            {roundData.round.status === "STARTING"
                              ? "SECURING GAME PROTOCOL..."
                              : roundData.participantsCount < 2
                                ? "WAITING FOR CHALLENGERS..."
                                : "GAME STARTING IN"}
                          </p>
                          <CountdownTimer
                            secondsRemaining={roundData.secondsRemaining || 0}
                            status={roundData.round.status}
                            participantCount={roundData.participantsCount}
                          />
                          {roundData.participantsCount < 2 && (
                            <div className="space-y-1 mt-4">
                              <p className="text-primary text-lg uppercase font-black animate-pulse tracking-[0.15em] font-display">
                                Waiting for Players...
                              </p>
                              <p className="text-[13px] text-white uppercase font-black tracking-[0.1em] opacity-90">
                                Minimum 2 participants required to start
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="w-full max-w-2xl mx-auto mb-2">
                          {!connected ? (
                            <div className="space-y-6">
                              <p className="text-white text-sm uppercase font-black tracking-widest italic">
                                Connect Wallet to Start
                              </p>
                              <WalletMultiButton className="!bg-primary !hover:bg-primary/90 !h-16 !px-10 !text-xl !rounded-2xl !w-full !font-black !italic !tracking-tighter !text-black shadow-lg" />
                            </div>
                          ) : participant || foundParticipant ? (
                            <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-[2rem] shadow-[0_0_30px_rgba(34,197,94,0.1)] w-full">
                              <p className="text-primary font-black text-3xl italic tracking-tighter mb-3 uppercase text-center">
                                YOU'RE IN THE GAME!
                              </p>
                              <p className="text-sm text-white uppercase font-black tracking-widest text-center opacity-90">
                                CARD ACTIVATES AUTOMATICALLY ON START
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <JoinButton
                                roundId={roundData.round.id}
                                price={PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE}
                                userId={user?.id || 0}
                              />
                              <p className="text-[12px] text-white uppercase font-black tracking-[0.2em] text-center opacity-80">
                                JOIN BEFORE GAME STARTS
                              </p>
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
                      <div className="glass-card neon-border rounded-xl p-4 flex flex-row items-center justify-between bg-black/60 border-primary/30 shrink-0">
                        <div className="flex flex-col">
                          <p className="text-sm text-white uppercase font-black tracking-widest font-mono mb-1">
                            Prize Pool
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-primary font-display italic leading-none drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                              {formatCurrency(roundData.round.prizePool || 0)}{" "}
                              {PROTOCOL_CONFIG.SYMBOL}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-8">
                          <div className="text-center">
                            <p className="text-sm text-white uppercase font-black tracking-widest font-mono mb-1">
                              Room
                            </p>
                            <p className="text-2xl font-black text-white font-display italic leading-none">
                              #{roundData.round.id}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-white uppercase font-black tracking-widest font-mono mb-1">
                              Players
                            </p>
                            <p className="text-2xl font-black text-white font-display italic leading-none">
                              {roundData.participantsCount}
                            </p>
                          </div>
                        </div>
                      </div>
                      {isParticipant &&
                      currentCard &&
                      roundData.round.status !== "FINISHED" &&
                      !roundData.round.winnerId ? (
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
                              <Globe className="w-3 h-3 animate-spin-slow" />{" "}
                              {roundData.round.winnerId ||
                              roundData.round.status === "FINISHED"
                                ? "ROUND COMPLETED"
                                : "Live Feed Active"}
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black font-display italic text-white tracking-tighter uppercase">
                              {roundData.round.winnerId ||
                              roundData.round.status === "FINISHED" ? (
                                <div className="flex flex-col items-center gap-6">
                                  <span className="text-primary animate-pulse text-5xl md:text-7xl">
                                    BINGO! ROUND WON
                                  </span>
                                  <div className="bg-primary/10 border border-primary/30 rounded-[2rem] p-8 w-full max-w-3xl shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                                    <p className="text-lg text-white uppercase font-black tracking-[0.4em] mb-8 text-center border-b border-white/10 pb-4">
                                      ROUND STATISTICS
                                    </p>
                                    <div className="space-y-10">
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="text-sm text-white uppercase font-black tracking-widest flex items-center gap-2">
                                          <Trophy className="w-4 h-4" /> WINNING
                                          PLAYER
                                        </span>
                                        <span className="text-4xl md:text-6xl font-black text-white italic tracking-tighter truncate max-w-full px-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                          {formatAddress(
                                            roundData.participants?.find(
                                              (p: any) =>
                                                p.userId ===
                                                  roundData.round.winnerId ||
                                                p.id ===
                                                  roundData.round.winnerId,
                                            )?.username || "Unknown",
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="text-sm text-white uppercase font-black tracking-widest flex items-center gap-2">
                                          <Coins className="w-4 h-4" /> TOTAL
                                          REWARD
                                        </span>
                                        <span className="text-5xl md:text-7xl font-black text-primary italic leading-none drop-shadow-[0_0_30_rgba(34,197,94,0.5)]">
                                          {formatCurrency(
                                            roundData.round.prizePool || 0,
                                          )}{" "}
                                          <span className="text-3xl ml-2">
                                            {PROTOCOL_CONFIG.SYMBOL}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-white font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
                                      NEXT ROUND IN {nextRoundTimer}S
                                    </span>
                                    <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: "100%" }}
                                        animate={{
                                          width: `${(nextRoundTimer / 10) * 100}%`,
                                        }}
                                        className="h-full bg-primary"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center space-y-8">
                                  <div className="relative w-48 h-48">
                                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                                    <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin" />
                                    <div className="absolute inset-4 rounded-full bg-black/40 flex items-center justify-center overflow-hidden">
                                      <div className="flex flex-col items-center">
                                        <div className="flex gap-1">
                                          {[1, 2, 3].map((i) => (
                                            <motion.div
                                              key={i}
                                              animate={{
                                                y: [0, -10, 0],
                                                scale: [1, 1.2, 1],
                                              }}
                                              transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                delay: i * 0.2,
                                              }}
                                              className="w-4 h-4 rounded-full bg-primary/40 flex items-center justify-center text-[8px] text-white font-bold"
                                            >
                                              {Math.floor(Math.random() * 75) + 1}
                                            </motion.div>
                                          ))}
                                        </div>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-tighter mt-2 animate-pulse">
                                          Shuffling...
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </h2>
                            {!roundData.round.winnerId &&
                              roundData.round.status !== "FINISHED" && (
                                <div className="flex flex-col w-full max-w-xl mx-auto mt-4 h-[450px]">
                                  <div className="flex flex-col items-center shrink-0 mb-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                      <Globe className="w-3 h-3 animate-spin-slow" />{" "}
                                      LIVE PLAYER FEED
                                    </div>
                                  </div>

                                  <div className="flex flex-col flex-1 min-h-0 bg-black/20 rounded-2xl border border-white/5 p-4">
                                    <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                                      <p className="text-white text-xs font-black uppercase tracking-[0.3em]">
                                        Challengers Status
                                      </p>
                                      <Users className="w-4 h-4 text-primary/40" />
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 relative">
                                      <AnimatePresence mode="popLayout">
                                        {sortedParticipants.map((p, idx) => (
                                          <motion.div
                                            layout
                                            key={p.id || p.username}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{
                                              type: "spring",
                                              stiffness: 500,
                                              damping: 30,
                                              mass: 1,
                                              opacity: { duration: 0.2 },
                                            }}
                                            className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group transition-all duration-300 hover:border-primary/30"
                                          >
                                            <div className="flex items-center gap-4 overflow-hidden">
                                              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                                {idx + 1}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-white font-black italic tracking-tighter truncate">
                                                  {formatAddress(p.username)}
                                                </span>
                                                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                                                  Challenger
                                                </span>
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <div className="text-primary font-black italic text-xl leading-none">
                                                {p.prob}%
                                              </div>
                                              <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
                                                Win Prob
                                              </div>
                                            </div>
                                          </motion.div>
                                        ))}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
