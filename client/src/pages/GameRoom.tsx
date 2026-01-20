import { useEffect, useState } from 'react';
import { useRoute, useLocation } from "wouter";
import { useRound, useParticipant, useClaimBingo } from "@/hooks/use-game";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { BingoCard } from "@/components/BingoCard";
import { LastCalledNumber } from "@/components/LastCalledNumber";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import { CyberButton } from "@/components/ui/CyberButton";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, History, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import crypto from "crypto";

export default function GameRoom() {
  const [, params] = useRoute("/game/:id");
  const roundId = Number(params?.id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: roundData, isLoading: roundLoading } = useRound(roundId);
  const { data: participant, isLoading: partLoading } = useParticipant(roundId, user?.id);
  
  const { mutate: claimBingo, isPending: claiming } = useClaimBingo();
  const [showWinner, setShowWinner] = useState(false);
  const [showVerifier, setShowVerifier] = useState(false);
  const [verifySeed, setVerifySeed] = useState("");
  const [verificationResult, setVerificationResult] = useState<{valid: boolean, hash: string} | null>(null);

  useEffect(() => {
    if (roundData?.round.winnerId) {
      setShowWinner(true);
    }
  }, [roundData?.round.winnerId]);

  const handleVerify = () => {
    if (!verifySeed || !roundData) return;
    try {
      const computedHash = crypto.createHash('sha256').update(verifySeed).digest('hex');
      setVerificationResult({
        valid: computedHash === roundData.round.publicHash,
        hash: computedHash
      });
    } catch (e) {
      console.error("Verification error:", e);
    }
  };

  if (!user) {
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
  const canClaim = participant && !participant.hasBingo && round.status === 'IN_GAME'; 

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 px-4 sm:px-0">
        
        {/* Top Section (Mobile) / Left Column (Desktop): Game Info */}
        <div className="lg:col-span-3 space-y-4 lg:space-y-6 order-2 lg:order-1">
          <div className="bg-card border border-white/10 rounded-2xl p-4 lg:p-6 shadow-2xl">
            <h3 className="text-[10px] lg:text-sm text-muted-foreground uppercase mb-3 lg:mb-4 font-display tracking-widest">Protocol Stats</h3>
            <div className="space-y-3 lg:space-y-4">
              <div className="flex justify-between items-end lg:block">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-black">Prize Pool</p>
                  <p className="text-xl lg:text-3xl font-black text-primary italic leading-none">{round.prizePool.toLocaleString()} <span className="text-xs">PUMP</span></p>
                </div>
                <div className="lg:mt-4">
                  <p className="text-[9px] text-muted-foreground uppercase font-black">Active Players</p>
                  <p className="text-lg lg:text-xl font-bold text-white leading-none">{participantsCount}</p>
                </div>
              </div>
              <div className="h-[1px] bg-white/5 hidden lg:block" />
              <div>
                 <p className="text-[9px] text-muted-foreground mb-1 font-display flex items-center justify-between tracking-widest">
                   VERIFICATION HASH
                   {round.status === 'FINISHED' && (
                     <button 
                       onClick={() => setShowVerifier(!showVerifier)}
                       className="text-[10px] text-primary hover:underline font-black"
                     >
                       VERIFY
                     </button>
                   )}
                 </p>
                 <div className="bg-black/40 p-2 rounded text-[9px] text-muted-foreground font-mono break-all border border-white/5 truncate">
                   {round.publicHash}
                 </div>
                 {round.status === 'FINISHED' && (
                   <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 space-y-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl"
                   >
                     <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest">SEED REVEALED</p>
                     <div className="text-[10px] text-emerald-400 font-mono break-all leading-tight">
                       {round.serverSeed}
                     </div>
                   </motion.div>
                 )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showVerifier && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-card border border-primary/30 rounded-2xl p-4 lg:p-6 space-y-4 overflow-hidden shadow-[0_0_20px_rgba(57,255,20,0.1)]"
              >
                <h3 className="text-xs text-primary uppercase font-display flex items-center gap-2 tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> Verifier
                </h3>
                <Input 
                  placeholder="Paste Seed" 
                  value={verifySeed}
                  onChange={(e) => setVerifySeed(e.target.value)}
                  className="bg-black/60 border-white/10 text-[10px] font-mono h-8"
                />
                <CyberButton 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-[9px] h-8"
                  onClick={handleVerify}
                >
                  VALIDATE
                </CyberButton>

                {verificationResult && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                    "p-3 rounded-xl border flex items-center gap-2",
                    verificationResult.valid ? "bg-primary/10 border-primary/20 text-primary" : "bg-red-500/10 border-red-500/20 text-red-500"
                  )}>
                    {verificationResult.valid ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <div className="overflow-hidden">
                      <p className="text-[8px] font-black uppercase tracking-widest">
                        {verificationResult.valid ? "SIGNATURE MATCH" : "INVALID"}
                      </p>
                      <p className="text-[8px] font-mono truncate opacity-60">{verificationResult.hash}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-card border border-white/10 rounded-2xl p-4 lg:p-6 h-[200px] lg:h-[250px] flex flex-col">
            <h3 className="text-[10px] lg:text-sm text-muted-foreground uppercase mb-3 lg:mb-4 font-display flex items-center gap-2 tracking-widest">
              <History className="w-4 h-4" /> Draw Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
              {drawnNumbers.slice().reverse().map((num, i) => (
                 <div key={i} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-muted-foreground font-mono text-[10px]">#{drawnNumbers.length - i}</span>
                    <span className="font-bold text-white text-sm">{num}</span>
                 </div>
              ))}
              {drawnNumbers.length === 0 && (
                <div className="text-center text-muted-foreground text-[10px] py-10 opacity-30 uppercase font-black tracking-widest italic">
                  Awaiting Genesis...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Game Grid */}
        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center">
           <div className="w-full max-w-[500px] mb-6 lg:mb-10">
              <LastCalledNumber numbers={drawnNumbers} />
           </div>

           {participant ? (
             <div className="w-full flex flex-col items-center">
               <div className="w-full max-w-[450px] relative group px-2 sm:px-0">
                 <div className="absolute -inset-4 bg-primary/5 rounded-[40px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                 <BingoCard 
                   card={participant.card as number[][]} 
                   drawnNumbers={drawnNumbers} 
                   className="w-full relative z-10"
                 />
               </div>
               
               {/* Massive BINGO Button */}
               <div className="mt-8 lg:mt-12 w-full max-w-[320px] px-4 sm:px-0">
                 <motion.div
                   animate={canClaim ? { 
                     scale: [1, 1.02, 1],
                     filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
                   } : {}}
                   transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                 >
                   <CyberButton 
                     variant="primary" 
                     size="xl" 
                     className={cn(
                       "w-full text-2xl h-16 lg:h-20 shadow-[0_0_30px_rgba(57,255,20,0.2)] transition-all active:scale-95",
                       !canClaim && "opacity-50 grayscale"
                     )}
                     disabled={!canClaim || claiming}
                     onClick={() => claimBingo({ roundId, userId: user.id })}
                   >
                     {claiming ? <Loader2 className="animate-spin w-8 h-8" /> : "BINGO!"}
                   </CyberButton>
                 </motion.div>
               </div>
             </div>
           ) : (
             <div className="w-full max-w-[450px] aspect-square flex flex-col items-center justify-center bg-card/40 rounded-[32px] border border-dashed border-white/10 p-10 text-center backdrop-blur-sm">
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                 <Users className="w-8 h-8 text-white/20" />
               </div>
               <h2 className="text-xl lg:text-2xl font-black uppercase italic tracking-tighter mb-3">Spectator Link</h2>
               <p className="text-muted-foreground text-sm uppercase font-display tracking-widest mb-8">Protocol view only. Access restricted to active participants.</p>
               <CyberButton variant="outline" onClick={() => setLocation('/')} className="w-full max-w-[200px]">
                 EXIT ROOM
               </CyberButton>
             </div>
           )}
        </div>

        {/* Right Column: Chat/Activity (Desktop Only) */}
        <div className="lg:col-span-3 hidden lg:flex flex-col h-full order-3">
           <div className="bg-card/60 border border-white/10 rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden backdrop-blur-xl">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
             
             <div className="mb-6">
               <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] italic mb-1">Comm-Link</h3>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                 <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Encrypted Stream</span>
               </div>
             </div>

             <div className="flex-1 flex flex-col justify-end space-y-4">
                <div className="text-[10px] text-muted-foreground/40 text-center mb-6 py-2 border-y border-white/5 font-black uppercase tracking-widest italic">
                  Communication Terminal Restricted
                </div>
                
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-1">
                  <p className="text-[10px] text-primary font-black uppercase tracking-wider">Protocol</p>
                  <p className="text-xs text-white/60 leading-tight">Welcome to Node #{roundId}. Integrity check complete.</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-1">
                  <p className="text-[10px] text-secondary font-black uppercase tracking-wider">Degen_0x1</p>
                  <p className="text-xs text-white/60 leading-tight">LFG! 🚀 PUMP it higher!</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="space-y-1">
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Alpha_Whale</p>
                  <p className="text-xs text-white/60 leading-tight">Gl everyone, big pot today.</p>
                </motion.div>
             </div>

             <div className="mt-6 pt-4 border-t border-white/5">
               <div className="h-10 bg-black/40 rounded-xl border border-white/5 flex items-center px-4">
                 <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Type message...</span>
               </div>
             </div>
           </div>
        </div>

      </div>

      <WinnerOverlay 
        show={showWinner} 
        username={round.winnerId ? "Protocol Winner" : "Unknown"}
        prize={round.prizePool}
        onClose={() => setLocation('/')}
      />
    </Layout>
  );
}
