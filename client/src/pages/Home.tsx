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
    // If not logged in, redirect (or handled by Layout/Auth check)
    // Ideally we might show a landing page here, but for now redirect
    if (window.location.pathname !== '/login') {
       window.location.href = '/login';
       return null;
    }
  }

  return (
    <Layout>
      <div className="space-y-12">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 overflow-hidden rounded-3xl bg-card border border-white/5">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center opacity-20 pointer-events-none mix-blend-screen"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none"></div>
          
          <div className="container relative z-10 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block px-3 py-1 mb-4 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider"
              >
                Live on Solana
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl font-black font-display tracking-tighter text-white mb-4"
              >
                PUMP <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">BINGO</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-muted-foreground mb-8 max-w-lg"
              >
                Fair, fast, and fun. Join real-time bingo rounds, compete for massive PUMP pools, and win instant payouts.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CyberButton size="lg" onClick={() => document.getElementById('lobby')?.scrollIntoView({ behavior: 'smooth' })}>
                  Start Playing
                </CyberButton>
              </motion.div>
            </div>
            
            {/* Stat Cards - Floating */}
            <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.4 }}
               className="hidden md:grid grid-cols-2 gap-4"
            >
               <div className="bg-black/50 backdrop-blur border border-white/10 p-6 rounded-2xl">
                 <p className="text-muted-foreground text-xs uppercase mb-1">Total Paid Out</p>
                 <p className="text-3xl font-bold font-display text-primary">1.2M+</p>
               </div>
               <div className="bg-black/50 backdrop-blur border border-white/10 p-6 rounded-2xl">
                 <p className="text-muted-foreground text-xs uppercase mb-1">Live Players</p>
                 <p className="text-3xl font-bold font-display text-secondary">428</p>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Game Lobby */}
        <section id="lobby" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-2">
              <PlayCircle className="text-primary" /> Active Lobby
            </h2>
            <div className="flex gap-2">
               {/* Filters could go here */}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rounds?.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
              
              {(!rounds || rounds.length === 0) && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-2xl">
                  <p className="text-muted-foreground">No active rounds. Check back soon!</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function RoundCard({ round }: { round: any }) {
  const { mutate: joinRound, isPending } = useJoinRound();
  const [, setLocation] = useLocation();

  const handleJoin = () => {
    joinRound(
      { roundId: round.id, userId: 1 }, // Note: User ID would come from auth context in real app
      {
        onSuccess: () => setLocation(`/game/${round.id}`),
        onError: (err) => alert(err.message) // Replace with toast
      }
    );
  };

  const isLive = round.status === 'IN_GAME' || round.status === 'STARTING';
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="group bg-card border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col"
    >
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
           <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isLive ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/10 text-muted-foreground'}`}>
             {isLive ? 'Live Now' : 'Upcoming'}
           </div>
           <div className="flex items-center text-muted-foreground text-xs font-mono">
             #{round.id.toString().padStart(4, '0')}
           </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Prize Pool</p>
            <p className="text-3xl font-black font-display text-white group-hover:text-primary transition-colors">
              {round.prizePool.toLocaleString()} <span className="text-lg">PUMP</span>
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-black/30 rounded-lg p-3">
               <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                 <Users className="w-3 h-3" /> Players
               </div>
               <p className="font-bold">12/100</p>
             </div>
             <div className="bg-black/30 rounded-lg p-3">
               <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                 <Clock className="w-3 h-3" /> Entry
               </div>
               <p className="font-bold text-primary">{round.price} PUMP</p>
             </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white/5 border-t border-white/5">
        <CyberButton 
          variant={isLive ? "secondary" : "primary"} 
          className="w-full"
          onClick={() => isLive ? setLocation(`/game/${round.id}`) : handleJoin()}
          disabled={isPending}
        >
          {isLive ? 'Spectate / Play' : `Join for ${round.price} PUMP`}
        </CyberButton>
      </div>
    </motion.div>
  );
}
