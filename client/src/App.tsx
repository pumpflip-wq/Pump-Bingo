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
import { motion, AnimatePresence } from "framer-motion";
import { History, ShieldCheck, Twitter, Settings, Menu, Users, X, Zap } from "lucide-react";
import { SiX } from "react-icons/si";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useAuth } from "./hooks/use-auth";

import { TermsModal } from "./components/TermsModal";
import { useWallet } from "@solana/wallet-adapter-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const IS_FREE_MODE = PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE === 0;

function FreeModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!IS_FREE_MODE || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-[200]"
        data-testid="banner-free-mode"
      >
        <div className="relative bg-black/90 backdrop-blur-xl border-t border-primary/30 shadow-[0_-4px_40px_rgba(34,197,94,0.15)]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
            <motion.div
              animate={{ x: ["0%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-[-100%] w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />
          </div>
          <div className="max-w-[1450px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-primary/20 border border-primary/40 shrink-0">
                <Zap className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
              </div>
              <p className="text-xs lg:text-sm font-bold tracking-wide text-white/90 truncate">
                <span className="text-primary font-black">FREE MODE</span>
                <span className="hidden sm:inline text-white/60 mx-2">—</span>
                <span className="hidden sm:inline">Play for free during our launch phase.</span>
                <span className="text-white/50 mx-1.5 hidden sm:inline">·</span>
                <span className="hidden md:inline text-white/70">Real money games with </span>
                <span className="hidden md:inline text-secondary font-black">{PROTOCOL_CONFIG.SYMBOL}</span>
                <span className="hidden md:inline text-white/70"> coming soon.</span>
              </p>
              <p className="text-xs font-bold text-white/70 sm:hidden">Play free · <span className="text-secondary">{PROTOCOL_CONFIG.SYMBOL}</span> mode coming soon</p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white/40 hover:text-white/80"
              data-testid="button-dismiss-free-banner"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const logoPng = "/logo.png";

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
  const { user, login } = useAuth();
  
  const walletAddress = publicKey?.toString();

  useEffect(() => {
    if (connected && walletAddress && (!user || user.username !== walletAddress)) {
      console.log("Auto-logging in for address:", walletAddress);
      login(walletAddress);
    }
  }, [connected, walletAddress, user, login]);

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
      <div className={`flex flex-col min-h-screen w-full bg-background text-foreground${IS_FREE_MODE ? " pb-12" : ""}`}>
        <TermsModal show={connected && !termsAccepted} onAccept={handleAcceptTerms} />
        <FreeModeBanner />
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
                    className="w-full h-full rounded-full object-cover"
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
                  <div className="hidden lg:flex items-center gap-1 lg:gap-3 p-1">
                    <a 
                      href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 lg:w-[52px] lg:h-[44px] rounded-lg lg:rounded-xl bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      title="Trade on Pump.fun"
                    >
                      <img src="https://pump.fun/favicon.ico" className="w-4 h-4 lg:w-7 lg:h-7 object-contain" alt="Pump.fun" />
                    </a>
                    <a 
                      href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 lg:w-[52px] lg:h-[44px] rounded-lg lg:rounded-xl bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      title="Chart on Dexscreener"
                    >
                      <img src="https://dexscreener.com/favicon.png" className="w-4 h-4 lg:w-7 lg:h-7 object-contain" alt="Dexscreener" />
                    </a>
                    <a 
                      href={PROTOCOL_CONFIG.TWITTER_URL} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 lg:w-[52px] lg:h-[44px] rounded-lg lg:rounded-xl bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white hover:text-primary"
                      title="Follow on X"
                    >
                      <SiX className="w-3 h-3 lg:w-5 lg:h-5" />
                    </a>
                  </div>
                  <div className="hidden sm:block scale-75 lg:scale-100 origin-right">
                    <div className="flex items-center gap-3">
                      <WalletMultiButton className="!bg-primary !text-black !h-10 lg:!h-11 !px-4 lg:!px-8 !text-xs lg:!text-sm !rounded-full !font-black !italic !tracking-tight !shadow-[0_0_20px_rgba(34,197,94,0.3)] !border-none" />
                    </div>
                  </div>

                  {/* Mobile Menu Trigger */}
                  <div className="sm:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <button className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-black hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]" data-testid="button-mobile-menu">
                          <Menu className="w-7 h-7" />
                        </button>
                      </SheetTrigger>
                      <SheetContent side="top" className="w-[300px] ml-auto mt-20 mr-4 bg-background/95 backdrop-blur-2xl border border-white/10 p-6 flex flex-col gap-6 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95" hideCloseButton>
                        <div className="flex flex-col gap-4">
                          <div className="scale-110 origin-left">
                            <WalletMultiButton className="!bg-primary !text-black !h-12 !px-6 !text-base !rounded-xl !font-black !italic !w-full !justify-center !border-none shadow-lg" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <Link href="/history" className="flex items-center gap-4 text-base font-black italic uppercase text-white hover:text-primary transition-colors py-3 border-b border-white/5">
                            <History className="w-5 h-5" /> History
                          </Link>
                          <Link href="/verify" className="flex items-center gap-4 text-base font-black italic uppercase text-white hover:text-primary transition-colors py-3 border-b border-white/5">
                            <ShieldCheck className="w-5 h-5" /> Verify
                          </Link>
                          {isAdmin && (
                            <Link href="/admin" className="flex items-center gap-4 text-base font-black italic uppercase text-primary hover:text-white transition-colors py-3">
                              <Settings className="w-5 h-5" /> Admin
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                          <a 
                            href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 h-12 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/10"
                            title="Pump.fun"
                          >
                            <img src="https://pump.fun/favicon.ico" className="w-5 h-5 object-contain" alt="Pump.fun" />
                          </a>
                          <a 
                            href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 h-12 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/10"
                            title="Dexscreener"
                          >
                            <img src="https://dexscreener.com/favicon.png" className="w-5 h-5 object-contain" alt="Dexscreener" />
                          </a>
                          <a 
                            href={PROTOCOL_CONFIG.TWITTER_URL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 h-12 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/10 text-white"
                            title="X"
                          >
                            <SiX className="w-5 h-5" />
                          </a>
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
