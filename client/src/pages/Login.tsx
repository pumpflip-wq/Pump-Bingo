import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { CyberButton } from "@/components/ui/CyberButton";
import { Wallet, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [username, setUsername] = useState("");
  const { login, isLoggingIn } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    login(username, {
      onSuccess: () => setLocation("/"),
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(157,0,255,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-6 border border-primary/50 rotate-3"
          >
             <Wallet className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black font-display text-white mb-2 tracking-tighter">
            CONNECT <span className="text-primary">WALLET</span>
          </h1>
          <p className="text-muted-foreground">
            Enter your username to access the PUMP BINGO network.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
             <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider ml-1">Username / Wallet</label>
             <input 
               type="text"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               placeholder="Enter username..."
               className="w-full bg-black/50 border-2 border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all font-display"
             />
          </div>

          <CyberButton 
            type="submit" 
            variant="primary" 
            className="w-full"
            disabled={!username.trim() || isLoggingIn}
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Connect & Play"
            )}
          </CyberButton>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By connecting, you agree to our <span className="text-primary cursor-pointer hover:underline">Terms of Degen Service</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
