import { useQuery } from "@tanstack/react-query";
import { type Transaction, type User } from "@shared/schema";
import { ShieldCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Profile() {
  const { data: user } = useQuery<User>({ 
    queryKey: ["/api/auth/me"]
  });

  const { data: userTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/auth/me/transactions", user?.id],
    enabled: !!user?.id,
  });

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <header className="flex items-center justify-between">
          <Link href="/">
            <a className="text-primary hover:text-primary/80 font-black uppercase tracking-widest text-sm">← Back to Game</a>
          </Link>
          <h1 className="text-3xl font-black font-display italic">MY <span className="text-primary">PROFILE</span></h1>
        </header>

        <div className="glass-card neon-border rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase font-black tracking-widest">Wallet Connected</p>
              <h2 className="text-xl font-black text-white">{formatAddress(user?.username || "")}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total Balance</p>
              <p className="text-2xl font-black text-white">{(user?.balance || 0).toLocaleString()} PUMP</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total Games</p>
              <p className="text-2xl font-black text-white">{userTransactions?.filter(t => t.type === 'BUY_IN').length || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-card neon-border rounded-3xl p-8 space-y-6">
          <h3 className="text-lg text-white uppercase font-black tracking-widest flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Recent Transactions
          </h3>
          
          <div className="space-y-3">
            {userTransactions?.length ? (
              userTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-white/40 font-mono">{tx.type}</span>
                    <span className="text-[10px] text-white/60 font-mono">{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={cn(
                    "font-black italic font-display text-lg",
                    tx.amount > 0 ? "text-primary" : "text-red-500"
                  )}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-10 text-white/20 font-black uppercase tracking-widest text-xs">No active data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
