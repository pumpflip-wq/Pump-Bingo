import { useRounds, useJoinRound } from "@/hooks/use-game";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberButton } from "@/components/ui/CyberButton";
import { Link, useLocation } from "wouter";
import { Clock, Users, Trophy, PlayCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data: rounds, isLoading } = useRounds();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    if (window.location.pathname !== '/login') {
       window.location.href = '/login';
       return null;
    }
  }

  const latestRound = rounds && rounds.length > 0 ? rounds[0] : null;

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <section className="text-center pt-8">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white mb-2 italic"
          >
            PUMP <span className="text-primary">BINGO</span>
          </motion.h1>
          <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase opacity-70">
            Fair • Fast • Fun • Solana
          </p>
        </section>

        {/* Global Game Card */}
        <section id="lobby" className="relative">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          ) : latestRound ? (
            <div className="space-y-6">
              <GlobalRoundCard round={latestRound} />
              
              {/* Fairness Banner */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Trophy className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Proof of Fairness</p>
                    <p className="text-[10px] font-mono text-white/40 break-all max-w-md">{latestRound.publicHash}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Round #{latestRound.id.toString().padStart(6, '0')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
              <p className="text-muted-foreground">Waiting for the next round to be generated...</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function GlobalRoundCard({ round }: { round: any }) {
  const { mutate: joinRound, isPending } = useJoinRound();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleJoin = () => {
    if (!user) {
      setLocation('/login');
      return;
    }
    joinRound(
      { roundId: round.id, userId: user.id },
      {
        onSuccess: () => setLocation(`/game/${round.id}`),
        onError: (err: any) => alert(err.message)
      }
    );
  };

  const isLive = round.status === 'IN_GAME' || round.status === 'STARTING';
  const isFinished = round.status === 'FINISHED';
  
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card border-2 border-white/10 rounded-[2rem] overflow-hidden p-8 md:p-12 shadow-[0_0_80px_rgba(57,255,20,0.05)]"
    >
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="flex items-center gap-4">
           <div className={`px-4 py-1 rounded-full text-sm font-black uppercase tracking-tighter ${isLive ? 'bg-primary text-black' : 'bg-white/10 text-muted-foreground'}`}>
             {round.status}
           </div>
           {isLive && <div className="w-2 h-2 rounded-full bg-primary animate-ping" />}
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">Prize Pool</p>
          <h2 className="text-7xl md:text-9xl font-black font-display text-white tracking-tighter">
            {round.prizePool.toLocaleString()}
          </h2>
          <p className="text-2xl font-black text-primary font-display">PUMP TOKENS</p>
        </div>

        <div className="grid grid-cols-2 gap-8 w-full max-w-md">
           <div className="space-y-1">
             <p className="text-xs text-muted-foreground uppercase font-bold">Buy-in</p>
             <p className="text-2xl font-display font-bold">{round.price} PUMP</p>
           </div>
           <div className="space-y-1">
             <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
             <p className="text-2xl font-display font-bold text-secondary">
               {round.status === 'OPEN' ? 'WAITING' : round.status}
             </p>
           </div>
        </div>

        <div className="w-full max-w-lg pt-4">
          <CyberButton 
            variant={isLive ? "secondary" : "primary"} 
            className="w-full h-24 text-3xl font-black italic tracking-tighter"
            onClick={() => isLive ? setLocation(`/game/${round.id}`) : handleJoin()}
            disabled={isPending || isFinished}
          >
            {isPending ? <Loader2 className="animate-spin" /> : 
             isLive ? 'ENTER GAME' : 
             isFinished ? 'ROUND ENDED' :
             `JOIN NEXT ROUND`}
          </CyberButton>
          {round.status === 'OPEN' && (
            <p className="mt-4 text-muted-foreground text-sm font-mono animate-pulse">
              STARTING AUTOMATICALLY SOON
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
