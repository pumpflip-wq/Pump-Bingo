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
import { useEffect, useRef, useState } from "react";

import { SolanaProvider, AudioInitializer } from "./components/SolanaProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { History, ShieldCheck } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";

import { SoundProvider } from "@/contexts/SoundContext";
import { ThemeToggle } from "./components/ThemeToggle";
import { TermsModal } from "./components/TermsModal";
import { useWallet } from "@solana/wallet-adapter-react";

const logoPng = "https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png";

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

function AppContent() {
  const [location] = useLocation();
  const scrollRef = useRef<HTMLElement>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { connected, publicKey } = useWallet();

  useEffect(() => {
    // Force dark mode globally
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
    
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location]);

  useEffect(() => {
    console.log(`[Terms] Wallet state - Connected: ${connected}, PublicKey: ${publicKey?.toString()}`);
    if (connected && publicKey) {
      const walletAddr = publicKey.toString();
      const acceptedWallets = JSON.parse(localStorage.getItem("pumbp_bingo_accepted_wallets") || "{}");
      console.log(`[Terms] Checking storage for wallet ${walletAddr}:`, acceptedWallets[walletAddr]);
      
      // Delaying the modal state slightly to ensure it's not bypassed by race conditions
      if (acceptedWallets[walletAddr]) {
        setTermsAccepted(true);
      } else {
        setTermsAccepted(false);
      }
    } else {
      setTermsAccepted(false);
    }
  }, [connected, publicKey]);

  const handleAcceptTerms = () => {
    if (publicKey) {
      const walletAddr = publicKey.toString();
      const acceptedWallets = JSON.parse(localStorage.getItem("pumbp_bingo_accepted_wallets") || "{}");
      acceptedWallets[walletAddr] = true;
      localStorage.setItem("pumbp_bingo_accepted_wallets", JSON.stringify(acceptedWallets));
      setTermsAccepted(true);
      
      // Explicit play to force context unlock during user interaction
      const audio = new Audio("/sounds/join.mp3");
      audio.volume = 0.1;
      audio.play().catch(() => {});
    }
  };

  return (
    <TooltipProvider>
      <SoundProvider>
        <AudioInitializer>
          <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
            <TermsModal show={connected && !termsAccepted} onAccept={handleAcceptTerms} />
            <header className="sticky top-0 z-[100] w-full bg-background/80 backdrop-blur-xl border-b border-white/5">
              <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between py-4 gap-6">
                <Link href="/" className="flex items-center gap-4 group cursor-pointer hover:opacity-90 transition-opacity">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className="w-20 h-20 rounded-full p-0 transition-all"
                  >
                    <img 
                      src={logoPng} 
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
                  <nav className="hidden md:flex items-center gap-8 mr-6">
                    <Link href="/history" className="text-sm font-black uppercase tracking-[0.15em] text-white hover:text-primary transition-all flex items-center gap-2">
                      <History className="w-4 h-4" /> History
                    </Link>
                    <Link href="/verify" className="text-sm font-black uppercase tracking-[0.15em] text-white hover:text-primary transition-all flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Verify
                    </Link>
                  </nav>
                  <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <a 
                      href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-[52px] h-[44px] rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center hover:scale-105 active:scale-95 border border-white/5"
                      title="Trade on Pump.fun"
                    >
                      <img src="https://pump.fun/favicon.ico" className="w-7 h-7 object-contain" alt="Pump.fun" />
                    </a>
                    <a 
                      href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-[52px] h-[44px] rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 flex items-center justify-center border border-white/5"
                      title="Chart on Dexscreener"
                    >
                      <img src="https://dexscreener.com/favicon.png" className="w-7 h-7 object-contain" alt="Dexscreener" />
                    </a>
                    <WalletMultiButton className="!bg-primary !text-black !h-11 !px-8 !text-sm !rounded-full !font-black !italic !tracking-tight !shadow-[0_0_20px_rgba(34,197,94,0.3)] !border-none" />
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 flex flex-col">
              <div className="flex-1 w-full max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
                <Router />
              </div>
              <Footer />
            </main>
          </div>
          <Toaster />
        </AudioInitializer>
      </SoundProvider>
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>
        <AppContent />
      </SolanaProvider>
    </QueryClientProvider>
  );
}

export default App;
