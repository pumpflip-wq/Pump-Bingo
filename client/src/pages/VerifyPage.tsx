import { useRounds, useRound } from "@/hooks/use-game";
import { ShieldCheck, Search, Copy, Check, ExternalLink, History } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import * as CryptoJS from "crypto-js";
import { Link, useLocation } from "wouter";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PROTOCOL_CONFIG } from "@shared/config";

export default function VerifyPage() {
  const { data: rounds } = useRounds();
  const [manualSeed, setManualSeed] = useState("");
  const [manualHash, setManualHash] = useState("");
  const { toast } = useToast();
  const [location] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const rId = searchParams.get('roundId');
  const targetId = rId ? Number(rId) : 0;

  const { data: roundData } = useRound(targetId);

  useEffect(() => {
    const seed = searchParams.get('seed');
    const hash = searchParams.get('hash');
    
    if (seed) setManualSeed(seed);
    if (hash) setManualHash(hash);
    
    if (roundData?.round) {
      if (!hash) setManualHash(roundData.round.publicHash);
      if (!seed) {
        if (roundData.round.status === 'FINISHED' && roundData.round.serverSeed) {
          setManualSeed(roundData.round.serverSeed);
        } else {
          setManualSeed("");
        }
      }
    } else if (rId && rounds) {
      // Fallback for immediate population if rounds are already loaded
      const round = rounds.find(r => r.id === Number(rId));
      if (round) {
        setManualHash(round.publicHash);
        if (round.status === 'FINISHED' && round.serverSeed) {
          setManualSeed(round.serverSeed);
        }
      }
    }
  }, [roundData, rId, rounds]);

  const verifySeed = (seed: string, expectedHash: string) => {
    if (!seed || !expectedHash) return false;
    try {
      const trimmedSeed = seed.trim();
      const trimmedHash = expectedHash.trim().toLowerCase();
      
      // Use crypto-js for browser-compatible SHA256 hashing
      const hash = CryptoJS.SHA256(trimmedSeed).toString(CryptoJS.enc.Hex).toLowerCase();
      
      console.log("Verification Logic Debug:", { 
        rawSeed: seed,
        trimmedSeed,
        computedHash: hash, 
        expectedHash: trimmedHash 
      });
      
      return hash === trimmedHash;
    } catch (e) {
      console.error("Verification Error:", e);
      return false;
    }
  };

  const verifyPublicHash = (seed: string, expectedHash: string) => {
    if (!seed || !expectedHash) return false;
    try {
      const hash = CryptoJS.SHA256(seed).toString(CryptoJS.enc.Hex).toLowerCase();
      return hash === expectedHash.toLowerCase();
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="flex flex-col bg-background text-foreground">
      <div className="w-full flex-1 flex flex-col space-y-4 max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex-1 space-y-6 py-4">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" /> Cryptographically Verifiable
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none">
              PROVABLY <span className="text-primary">FAIR</span>
            </h1>
            <p className="text-white uppercase font-black tracking-widest text-sm max-w-2xl mx-auto drop-shadow-sm">
              Our system uses a pre-generated server seed that is hashed and revealed only after the round ends. 
              This ensures that the house cannot manipulate the outcome of any game.
            </p>
          </div>

          <div className="glass-card neon-border rounded-[2rem] p-6 space-y-6">
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
              <Search className="w-6 h-6 text-primary" /> Current Round
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white">Round ID</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white">Public Hash</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white">Server Seed</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rounds?.slice(0, 10).map((round) => (
                    <tr key={round.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6 font-mono text-base text-white font-bold">#{round.id}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 max-w-[250px]">
                          <span className="font-mono text-xs text-white font-bold truncate">{round.publicHash}</span>
                          <Copy className="w-4 h-4 text-white/40 cursor-pointer hover:text-primary transition-colors" onClick={() => {
                            navigator.clipboard.writeText(round.publicHash);
                            toast({ title: "Hash Copied" });
                          }} />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {round.status === 'FINISHED' ? (
                          <div className="flex items-center gap-2 max-w-[250px]">
                            <span className="font-mono text-xs text-primary font-bold truncate">{round.serverSeed}</span>
                            <Copy className="w-4 h-4 text-primary/60 cursor-pointer hover:text-primary transition-colors" onClick={() => {
                              navigator.clipboard.writeText(round.serverSeed || "");
                              toast({ title: "Seed Copied" });
                            }} />
                          </div>
                        ) : (
                          <span className="text-xs font-black uppercase tracking-widest text-white/40">Hidden</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-md ${
                            round.status === 'FINISHED' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/10 text-white border border-white/10'
                          }`}>
                            {round.status}
                          </span>
                          <button 
                            onClick={() => {
                              setManualHash(round.publicHash);
                              setManualSeed(round.status === 'FINISHED' ? (round.serverSeed || "") : "");
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors underline"
                          >
                            Use for manual
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card neon-border rounded-[2rem] p-6 space-y-6">
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" /> Manual Verification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-[0.2em] text-white ml-2">Server Seed</label>
                <input 
                  value={manualSeed}
                  onChange={(e) => setManualSeed(e.target.value)}
                  placeholder="Enter server seed..."
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-6 py-4 font-mono text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-[0.2em] text-white ml-2">Expected Public Hash</label>
                <input 
                  value={manualHash}
                  onChange={(e) => setManualHash(e.target.value)}
                  placeholder="Enter public hash..."
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-6 py-4 font-mono text-base text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>
            
            {manualSeed && manualHash && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-sm ${
                  verifySeed(manualSeed, manualHash) 
                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(34,197,94,0.15)]' 
                    : 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                }`}
              >
                {verifySeed(manualSeed, manualHash) ? (
                  <>
                    <Check className="w-5 h-5" /> Valid Verification
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" /> Invalid Verification
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
