import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { CyberButton } from "./ui/CyberButton";
import { Wallet, Trophy, LogOut } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-primary selection:text-black flex flex-col">
      {/* Matrix-like subtle background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.1),transparent_70%)] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
             <div className="w-8 h-8 bg-primary rounded-sm rotate-45 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <span className="text-black font-black text-lg -rotate-45 group-hover:-rotate-90 transition-transform duration-300">P</span>
             </div>
             <span className="font-display font-bold text-xl tracking-tighter text-white group-hover:text-primary transition-colors">
               PUMP<span className="text-primary">BINGO</span>
             </span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs text-muted-foreground font-display">BALANCE</span>
                <span className="text-primary font-bold font-display flex items-center gap-1">
                  {user.balance.toLocaleString()} <span className="text-[10px] bg-primary/20 px-1 rounded text-primary">PUMP</span>
                </span>
              </div>
              
              <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold hidden sm:block">@{user.username}</span>
                <CyberButton variant="ghost" size="sm" onClick={logout} className="px-2">
                  <LogOut className="w-4 h-4" />
                </CyberButton>
              </div>
            </div>
          ) : (
            location !== '/login' && (
              <Link href="/login">
                <CyberButton variant="primary" size="sm" className="gap-2">
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </CyberButton>
              </Link>
            )
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-auto relative z-10 bg-black">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p className="font-display">© 2025 PUMP BINGO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="hover:text-primary cursor-pointer transition-colors">FAIRNESS</span>
            <span className="hover:text-primary cursor-pointer transition-colors">RULES</span>
            <span className="hover:text-primary cursor-pointer transition-colors">SUPPORT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
