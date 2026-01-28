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

import { SolanaProvider } from "./components/SolanaProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { History, ShieldCheck, Twitter, Settings, Menu } from "lucide-react";
import { SiX } from "react-icons/si";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useAuth } from "./hooks/use-auth";

import { TermsModal } from "./components/TermsModal";
import { useWallet } from "@solana/wallet-adapter-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const { user } = useAuth();
  
  const walletAddress = publicKey?.toString();
  const isAdmin = walletAddress === PROTOCOL_CONFIG.ADMIN_WALLET || user?.username === PROTOCOL_CONFIG.ADMIN_WALLET;

  useEffect(() => {
    // Force dark mode globally and remove any light mode references
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    localStorage.setItem("theme", "dark");
    
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location]);

  useEffect(() => {
    if (connected && publicKey) {
      const walletAddr = publicKey.toString();
      const acceptedWallets = JSON.parse(localStorage.getItem("pumbp_bingo_accepted_wallets") || "{}");
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
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
        <TermsModal show={connected && !termsAccepted} onAccept={handleAcceptTerms} />
          <header className="sticky top-0 z-[100] w-full bg-background/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-[1450px] mx-auto px-4 lg:px-8 flex flex-row items-center justify-between py-2 lg:py-4 gap-2 lg:gap-6">
              <Link href="/" className="flex items-center gap-2 lg:gap-4 group cursor-pointer hover:opacity-90 transition-opacity shrink-0">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  className="w-14 h-14 lg:w-20 lg:h-20 rounded-full p-0 transition-all"
                >
                  <img 
                    src={logoPng} 
                    alt="PUMP BINGO" 
                    className="w-full h-full rounded-full object-cover shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  />
                </motion.div>
                <div className="flex flex-col">
                  <h1 className="text-2xl lg:text-4xl font-black font-display tracking-tighter text-white italic leading-none">
                    PUMP <span className="text-primary">BINGO</span>
                  </h1>
                </div>
              </Link>

              <div className="flex items-center gap-2 lg:gap-4 ml-auto">
                <nav className="hidden sm:flex items-center gap-4 lg:gap-8 mr-2 lg:mr-6">
                  <Link href="/history" className="text-xs lg:text-sm font-black uppercase tracking-[0.15em] text-white hover:text-primary transition-all flex items-center gap-2">
                    <History className="w-4 h-4" /> History
                  </Link>
                  <Link href="/verify" className="text-xs lg:text-sm font-black uppercase tracking-[0.15em] text-white hover:text-primary transition-all flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Verify
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="text-xs lg:text-sm font-black uppercase tracking-[0.15em] text-primary hover:text-white transition-all flex items-center gap-2" data-testid="link-admin">
                      <Settings className="w-4 h-4" /> Admin
                    </Link>
                  )}
                </nav>
                <div className="flex items-center gap-1 lg:gap-4">
                  <div className="hidden lg:flex items-center gap-1 lg:gap-3 bg-black/40 p-1 rounded-xl border border-white/5">
                    <a 
                      href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 lg:w-[52px] lg:h-[44px] rounded-lg lg:rounded-xl bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20"
                      title="Trade on Pump.fun"
                    >
                      <img src="https://pump.fun/favicon.ico" className="w-4 h-4 lg:w-7 lg:h-7 object-contain" alt="Pump.fun" />
                    </a>
                    <a 
                      href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 lg:w-[52px] lg:h-[44px] rounded-lg lg:rounded-xl bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20"
                      title="Chart on Dexscreener"
                    >
                      <img src="https://dexscreener.com/favicon.png" className="w-4 h-4 lg:w-7 lg:h-7 object-contain" alt="Dexscreener" />
                    </a>
                    <a 
                      href={PROTOCOL_CONFIG.TWITTER_URL} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 lg:w-[52px] lg:h-[44px] rounded-lg lg:rounded-xl bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 text-white hover:text-primary"
                      title="Follow on X"
                    >
                      <SiX className="w-3 h-3 lg:w-5 lg:h-5" />
                    </a>
                  </div>
                  <div className="hidden sm:block scale-75 lg:scale-100 origin-right">
                    <WalletMultiButton className="!bg-primary !text-black !h-10 lg:!h-11 !px-4 lg:!px-8 !text-xs lg:!text-sm !rounded-full !font-black !italic !tracking-tight !shadow-[0_0_20px_rgba(34,197,94,0.3)] !border-none" />
                  </div>

                  {/* Mobile Menu Trigger */}
                  <div className="sm:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white hover:text-primary transition-colors" data-testid="button-mobile-menu">
                          <Menu className="w-6 h-6" />
                        </button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-[300px] bg-background/95 backdrop-blur-2xl border-white/5 p-6 flex flex-col gap-8">
                        <div className="flex flex-col gap-4 mt-8">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Navigation</p>
                          <Link href="/history" className="flex items-center gap-3 text-lg font-black italic uppercase text-white hover:text-primary transition-colors py-2 border-b border-white/5">
                            <History className="w-5 h-5" /> History
                          </Link>
                          <Link href="/verify" className="flex items-center gap-3 text-lg font-black italic uppercase text-white hover:text-primary transition-colors py-2 border-b border-white/5">
                            <ShieldCheck className="w-5 h-5" /> Verify
                          </Link>
                          {isAdmin && (
                            <Link href="/admin" className="flex items-center gap-3 text-lg font-black italic uppercase text-primary hover:text-white transition-colors py-2 border-b border-white/5">
                              <Settings className="w-5 h-5" /> Admin
                            </Link>
                          )}
                        </div>

                        <div className="flex flex-col gap-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Account</p>
                          <div className="scale-100 origin-left">
                            <WalletMultiButton className="!bg-primary !text-black !h-12 !px-6 !text-sm !rounded-xl !font-black !italic !w-full !justify-center !border-none shadow-lg" />
                          </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Connect</p>
                          <div className="flex items-center gap-3">
                            <a 
                              href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 h-12 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/10"
                            >
                              <img src="https://pump.fun/favicon.ico" className="w-6 h-6 object-contain" alt="Pump.fun" />
                            </a>
                            <a 
                              href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 h-12 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/10"
                            >
                              <img src="https://dexscreener.com/favicon.png" className="w-6 h-6 object-contain" alt="Dexscreener" />
                            </a>
                            <a 
                              href={PROTOCOL_CONFIG.TWITTER_URL} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 h-12 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/10 text-white"
                            >
                              <SiX className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
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
