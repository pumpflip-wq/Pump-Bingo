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
            
            <div className="md:hidden space-y-4">
              {rounds?.slice(0, 5).map((round) => (
                <div key={round.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary text-xl">#{round.id}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg w-fit shadow-lg ${
                      round.status === 'FINISHED' ? 'bg-primary/20 text-primary border border-primary/20' : 
                      round.status === 'IN_GAME' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20' :
                      'bg-white/20 text-white border border-white/20'
                    }`}>
                      {round.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Drawn Numbers</p>
                    <div className="flex flex-wrap gap-2">
                      {round.drawnNumbers && round.drawnNumbers.length > 0 ? (
                        round.drawnNumbers.map((num, i) => (
                          <span key={i} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white border border-white/20">
                            {num}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-black uppercase tracking-widest text-white/40">No draws yet</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase text-white/40 shrink-0">Hash:</span>
                      <span className="font-mono text-xs text-white font-black truncate flex-1">{round.publicHash}</span>
                      <Copy className="w-4 h-4 text-white/60 cursor-pointer hover:text-primary transition-colors" onClick={() => {
                        navigator.clipboard.writeText(round.publicHash);
                        toast({ title: "Hash Copied" });
                      }} />
                    </div>
                    {round.status === 'FINISHED' && round.serverSeed && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase text-primary shrink-0">Seed:</span>
                        <span className="font-mono text-xs text-primary font-black truncate flex-1">{round.serverSeed}</span>
                        <Copy className="w-4 h-4 text-primary cursor-pointer hover:text-white transition-colors" onClick={() => {
                          navigator.clipboard.writeText(round.serverSeed);
                          toast({ title: "Seed Copied" });
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white whitespace-nowrap">Round ID</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white whitespace-nowrap">Mode</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white whitespace-nowrap">Status</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white whitespace-nowrap">Drawn Numbers</th>
                    <th className="py-4 px-6 text-sm font-black uppercase tracking-widest text-white whitespace-nowrap">Verification Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rounds?.slice(0, 10).map((round) => (
                    <tr key={round.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-6 px-6 font-mono text-lg text-white font-black whitespace-nowrap">#{round.id}</td>
                      <td className="py-6 px-6">
                        {(round as any).mode === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">💰 PAID</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest">⚡ FREE</span>
                        )}
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex flex-col gap-2">
                          <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg w-fit shadow-lg ${
                            round.status === 'FINISHED' ? 'bg-primary/20 text-primary border border-primary/20' : 
                            round.status === 'IN_GAME' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20' :
                            'bg-white/20 text-white border border-white/20'
                          }`}>
                            {round.status}
                          </span>
                          {round.status === 'OPEN' && (
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Waiting for players...</span>
                          )}
                        </div>
                      </td>
                      <td className="py-6 px-6 min-w-[250px]">
                        <div className="flex flex-wrap gap-2 max-w-[350px]">
                          {round.drawnNumbers && round.drawnNumbers.length > 0 ? (
                            round.drawnNumbers.map((num, i) => (
                              <span key={i} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white border border-white/20 shadow-inner">
                                {num}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-black uppercase tracking-widest text-white">No draws yet</span>
                          )}
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase text-white">Hash:</span>
                            <span className="font-mono text-xs text-white font-black truncate max-w-[150px]">{round.publicHash}</span>
                            <Copy className="w-4 h-4 text-white cursor-pointer hover:text-primary transition-colors" onClick={() => {
                              navigator.clipboard.writeText(round.publicHash);
                              toast({ title: "Hash Copied" });
                            }} />
                          </div>
                          {round.status === 'FINISHED' && round.serverSeed && (
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black uppercase text-primary">Seed:</span>
                              <span className="font-mono text-xs text-primary font-black truncate max-w-[150px]">{round.serverSeed}</span>
                              <Copy className="w-4 h-4 text-primary cursor-pointer hover:text-white transition-colors" onClick={() => {
                                navigator.clipboard.writeText(round.serverSeed);
                                toast({ title: "Seed Copied" });
                              }} />
                            </div>
                          )}
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
