import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import VerifyPage from "@/pages/VerifyPage";
import GameHistory from "@/pages/GameHistory";
import { Footer } from "./components/Footer";
import { useEffect, useRef } from "react";

import { SolanaProvider } from "./components/SolanaProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ThemeToggle } from "./components/ThemeToggle";
import { motion } from "framer-motion";
import { History, ShieldCheck } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/verify" component={VerifyPage} />
      <Route path="/history" component={GameHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>
        <TooltipProvider>
          <div className="flex flex-col min-h-screen w-full bg-background text-foreground overflow-y-auto" ref={scrollRef as any}>
            <header className="w-full flex flex-col md:flex-row items-center justify-between pb-4 pt-4 gap-6 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-4 group cursor-pointer hover:opacity-90 transition-opacity">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  className="w-20 h-20 rounded-full p-0 transition-all"
                >
                  <img 
                    src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                    alt="PUMP BINGO" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </motion.div>
                <div className="flex flex-col">
                  <h1 className="text-4xl font-black font-display tracking-tighter text-white italic leading-none">
                    PUMP <span className="text-primary">BINGO</span>
                  </h1>
                </div>
              </Link>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <nav className="hidden md:flex items-center gap-6 mr-4">
                  <Link href="/history" className="text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-all flex items-center gap-2">
                    <History className="w-4 h-4" /> History
                  </Link>
                  <Link href="/verify" className="text-xs font-black uppercase tracking-widest text-white hover:text-primary transition-all flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Verify
                  </Link>
                </nav>
                <div className="flex items-center gap-3">
                  <a 
                    href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
                    title="Trade on Pump.fun"
                  >
                    <img src="https://pump.fun/favicon.ico" className="w-6 h-6 object-contain" alt="Pump.fun" />
                  </a>
                  <a 
                    href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Chart on Dexscreener"
                  >
                    <img src="https://dexscreener.com/favicon.png" className="w-6 h-6 object-contain" alt="Dexscreener" />
                  </a>
                  <WalletMultiButton className="!bg-primary !text-black !h-11 !px-8 !text-sm !rounded-full !font-black !italic !tracking-tight !shadow-[0_0_20px_rgba(34,197,94,0.3)] !border-none" />
                </div>
              </div>
            </header>
            <main className="flex-1 flex flex-col">
              <div className="flex-1 pb-8 pt-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Router />
              </div>
              <Footer />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </SolanaProvider>
    </QueryClientProvider>
  );
}

export default App;
