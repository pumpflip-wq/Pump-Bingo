import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { CyberButton } from "./ui/CyberButton";
import { Wallet, Trophy, ShieldCheck, Github, Settings, ShoppingCart, BarChart3 } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";

const ADMIN_WALLET = "DajB37qp74UzwND3N1rVWtLdxr55nhvuK2D4x476zmns";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-primary selection:text-black flex flex-col">
      {/* Matrix-like subtle background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.1),transparent_70%)] pointer-events-none z-0" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-black group-hover:scale-110 transition-transform">
                P
              </div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic hidden sm:block">PUMP BINGO</h1>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <a href={PROTOCOL_CONFIG.PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
              <CyberButton size="sm" variant="outline" className="hidden md:flex gap-2 border-primary/20 hover:border-primary/50 text-[10px] font-black">
                <ShoppingCart className="w-3 h-3 text-primary" /> BUY ${PROTOCOL_CONFIG.SYMBOL}
              </CyberButton>
            </a>
            <a href={PROTOCOL_CONFIG.DEXSCANNER_URL} target="_blank" rel="noopener noreferrer">
              <CyberButton size="sm" variant="outline" className="hidden md:flex gap-2 border-white/10 text-[10px] font-black">
                <BarChart3 className="w-3 h-3" /> CHART
              </CyberButton>
            </a>
            <div className="h-8 w-[1px] bg-white/10 hidden md:block mx-2" />
            <Link href="/login">
              <CyberButton size="sm" variant="primary" className="text-[10px] font-black h-9 px-4">
                {user ? "PROFILE" : "SELECT WALLET"}
              </CyberButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {children}
      </main>

      {/* Improved Footer */}
      <footer className="border-t border-white/5 py-12 mt-auto relative z-10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-black">
                  P
                </div>
                <h2 className="text-xl font-black tracking-tighter uppercase italic">PUMP BINGO</h2>
              </div>
              <p className="text-muted-foreground text-xs max-w-xs uppercase leading-relaxed font-display tracking-wider">
                The most decentralized and fair bingo protocol on the Solana ecosystem. 
                Built for degens, by degens.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Protocol</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2">
                    <Trophy className="w-3 h-3" /> LOBBY
                  </Link>
                </li>
                {user?.username === ADMIN_WALLET && (
                  <li>
                    <Link href="/admin" className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2">
                      <Settings className="w-3 h-3" /> ADMIN TERMINAL
                    </Link>
                  </li>
                )}
                <li>
                  <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> FAIRNESS
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Connect</h3>
              <div className="flex gap-4">
                <CyberButton size="sm" variant="outline" className="h-8 w-8">
                  <Github className="w-4 h-4" />
                </CyberButton>
                <CyberButton size="sm" variant="outline" className="h-8 w-8 text-primary border-primary/20">
                  <span className="font-black text-[10px]">X</span>
                </CyberButton>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-muted-foreground font-black tracking-widest uppercase italic">
            <p>© 2026 PUMP BINGO PROTOCOL. SYSTEM STATUS: OPERATIONAL</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-primary/40 animate-pulse">LIVE ON MAINNET-BETA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
