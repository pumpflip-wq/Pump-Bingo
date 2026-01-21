import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import VerifyPage from "@/pages/VerifyPage";
import { Footer } from "./components/Footer";

import { SolanaProvider } from "./components/SolanaProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ThemeToggle } from "./components/ThemeToggle";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/verify" component={VerifyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>
        <TooltipProvider>
          <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <div className="flex flex-col flex-1">
              <main className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex-1 pb-20">
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
