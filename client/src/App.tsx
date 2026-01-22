import { Switch, Route, useLocation } from "wouter";
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
          <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <div className="flex flex-col flex-1 relative overflow-hidden">
              <main 
                ref={scrollRef}
                className="flex-1 overflow-y-auto flex flex-col"
              >
                <div className="flex-1 pb-8 pt-0">
                  <Router />
                </div>
                <Footer />
              </main>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </SolanaProvider>
    </QueryClientProvider>
  );
}

export default App;
