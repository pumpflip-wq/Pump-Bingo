import { useEffect, useState } from 'react';
import { useRoute, useLocation } from "wouter";
import { useRound, useParticipant, useClaimBingo } from "@/hooks/use-game";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { CyberButton } from "@/components/ui/CyberButton";
import { Loader2, AlertCircle, Share2, History } from "lucide-react";
import { motion } from "framer-motion";

export default function GameRoom() {
  const [, params] = useRoute("/game/:id");
  const roundId = Number(params?.id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: roundData, isLoading: roundLoading } = useRound(roundId);
  // Safely handle user potentially being null (though Layout/Auth guard handles it usually)
  const { data: participant, isLoading: partLoading } = useParticipant(roundId, user?.id);
  
  const { mutate: claimBingo, isPending: claiming } = useClaimBingo();
  const [showWinner, setShowWinner] = useState(false);

  // Check for winner
  useEffect(() => {
    if (roundData?.round.winnerId) {
      setShowWinner(true);
    }
  }, [roundData?.round.winnerId]);

  if (!user) {
      // Very basic auth guard
      if (typeof window !== 'undefined') window.location.href = '/login';
      return null;
  }

  if (roundLoading || partLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <p className="font-display text-muted-foreground animate-pulse">CONNECTING TO GAME SERVER...</p>
        </div>
      </Layout>
    );
  }

  if (!roundData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Round Not Found</h1>
          <CyberButton onClick={() => setLocation('/')}>Back to Lobby</CyberButton>
        </div>
      </Layout>
    );
  }

  const { round, participantsCount } = roundData;
  const drawnNumbers = round.drawnNumbers || [];
  
  // Basic validation to see if BINGO is possible (simplified for frontend visual)
  // Real validation happens on backend
  const canClaim = participant && !participant.hasBingo && round.status === 'IN_GAME'; 

  return (
    <Layout>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Game Info & Feed */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <div className="bg-card border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm text-muted-foreground uppercase mb-4 font-display">Round Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">PRIZE POOL</p>
                <p className="text-2xl font-black text-primary">{round.prizePool.toLocaleString()} PUMP</p>
              </div>
              <div className="h-[1px] bg-white/10" />
              <div>
                <p className="text-xs text-muted-foreground">PLAYERS</p>
                <p className="text-xl font-bold text-white">{participantsCount}</p>
              </div>
              <div className="h-[1px] bg-white/10" />
              <div>
                 <p className="text-xs text-muted-foreground mb-1">PROOF OF FAIRNESS</p>
                 <div className="bg-black p-2 rounded text-[10px] text-muted-foreground font-mono break-all border border-white/5 truncate">
                   {round.publicHash}
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-white/10 rounded-2xl p-6 h-[300px] flex flex-col">
            <h3 className="text-sm text-muted-foreground uppercase mb-4 font-display flex items-center gap-2">
              <History className="w-4 h-4" /> Draw History
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {drawnNumbers.slice().reverse().map((num, i) => (
                 <div key={i} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-muted-foreground font-mono">#{drawnNumbers.length - i}</span>
                    <span className="font-bold text-white">{num}</span>
                 </div>
              ))}
              {drawnNumbers.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-10 opacity-50">
                  Waiting for start...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Bingo Card */}
        <div className="lg:col-span-6 order-1 lg:order-2">
           <div className="flex justify-center mb-8">
              <LastCalledNumber numbers={drawnNumbers} />
           </div>

           {participant ? (
             <div className="relative">
               <BingoCard 
                 card={participant.card as number[][]} 
                 drawnNumbers={drawnNumbers} 
                 className="w-full max-w-[500px] mx-auto"
               />
               
               {/* Massive BINGO Button */}
               <div className="mt-8 flex justify-center">
                 <motion.div
                   animate={canClaim ? { scale: [1, 1.05, 1] } : {}}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="w-full max-w-[300px]"
                 >
                   <CyberButton 
                     variant="primary" 
                     size="xl" 
                     className="w-full text-2xl"
                     disabled={!canClaim || claiming}
                     onClick={() => claimBingo({ roundId, userId: user.id })}
                   >
                     {claiming ? <Loader2 className="animate-spin" /> : "BINGO!"}
                   </CyberButton>
                 </motion.div>
               </div>
             </div>
           ) : (
             <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-white/10">
               <h2 className="text-2xl font-bold mb-2">Spectator Mode</h2>
               <p className="text-muted-foreground mb-6">You are watching this round.</p>
               <CyberButton variant="outline" onClick={() => setLocation('/')}>Return to Lobby</CyberButton>
             </div>
           )}
        </div>

        {/* Right Column: Chat/Activity (Placeholder) */}
        <div className="lg:col-span-3 hidden lg:block order-3">
           <div className="bg-card border border-white/10 rounded-2xl p-6 h-full min-h-[500px] flex flex-col relative overflow-hidden">
             {/* Decorative placeholder for chat */}
             <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="font-display text-4xl -rotate-45 font-bold">CHAT</span>
             </div>
             
             <div className="flex-1 flex flex-col justify-end space-y-3">
                <div className="text-xs text-muted-foreground text-center mb-4">Chat disabled in MVP</div>
                
                {/* Fake chat messages for ambience */}
                <div className="text-sm">
                  <span className="text-primary font-bold">System:</span> <span className="text-white/70">Welcome to the round!</span>
                </div>
                <div className="text-sm">
                  <span className="text-secondary font-bold">DegenKing:</span> <span className="text-white/70">LFG!!! 🚀</span>
                </div>
                <div className="text-sm">
                  <span className="text-emerald-400 font-bold">SolanaWhale:</span> <span className="text-white/70">Good luck everyone</span>
                </div>
             </div>
           </div>
        </div>

      </div>

      <WinnerOverlay 
        show={showWinner} 
        username={round.winnerId ? "WinnerPlayer" : "Unknown"} // Ideally fetch winner name
        prize={round.prizePool}
        onClose={() => setLocation('/')}
      />
    </Layout>
  );
}
