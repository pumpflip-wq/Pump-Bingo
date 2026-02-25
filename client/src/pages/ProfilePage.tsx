import { useGameState } from "@/hooks/useGameState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Gamepad2, User as UserIcon, Wallet, ArrowLeft } from "lucide-react";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { PROTOCOL_CONFIG } from "@shared/config";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, walletAddress, connected, isLoading } = useGameState();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!connected || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <UserIcon className="w-20 h-20 text-white/20" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black uppercase text-white">Connect Wallet</h2>
          <p className="text-white/60">Please connect your wallet to view your profile.</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="font-black uppercase italic">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Game
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <UserIcon className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
              PLAYER <span className="text-primary">PROFILE</span>
            </h1>
            <div className="flex items-center gap-2 text-white/60 font-mono text-sm">
              <Wallet className="w-4 h-4" />
              {formatAddress(walletAddress || "")}
            </div>
          </div>
        </div>
        <Link href="/">
          <Button variant="outline" className="font-black uppercase italic border-white/10 hover:border-primary/50 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Game
          </Button>
        </Link>
      </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card neon-border bg-black/40 border-primary/20 h-full">
            <CardHeader>
              <CardTitle className="text-xl font-black italic tracking-widest uppercase flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" /> Game Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Total Games</p>
                <p className="text-4xl font-black text-white italic leading-none">{user.totalGames || 0}</p>
              </div>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Total Wins</p>
                <p className="text-4xl font-black text-primary italic leading-none">{user.totalWins || 0}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card neon-border bg-black/40 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-black italic tracking-widest uppercase flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" /> Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-4 border-b md:border-b-0 md:border-r border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">User ID</p>
                  <p className="font-mono text-white">#{user.id}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Member Since</p>
                  <p className="text-white">{new Date(user.createdAt!).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
