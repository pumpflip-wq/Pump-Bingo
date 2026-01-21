import { useRounds } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { ShieldCheck, Search, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import crypto from "crypto";

export default function VerifyPage() {
  const { data: rounds } = useRounds();
  const [manualSeed, setManualSeed] = useState("");
  const [manualHash, setManualHash] = useState("");
  const { toast } = useToast();

  const verifySeed = (seed: string, expectedHash: string) => {
    try {
      const hash = crypto.createHash('sha256').update(seed).digest('hex');
      return hash === expectedHash;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" /> Cryptographically Verifiable
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase">
            PROVABLY <span className="text-primary">FAIR</span>
          </h1>
          <p className="text-white/60 uppercase font-black tracking-widest text-sm max-w-2xl mx-auto">
            Our system uses a pre-generated server seed that is hashed and revealed only after the round ends. 
            This ensures that the house cannot manipulate the outcome of any game.
          </p>
        </div>

        <div className="glass-card neon-border rounded-[2rem] p-8 space-y-8">
          <h2 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
            <Search className="w-5 h-5 text-primary" /> Recent Rounds
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Round ID</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Public Hash</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Server Seed</th>
                  <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rounds?.slice(0, 10).map((round) => (
                  <tr key={round.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 font-mono text-sm text-white">#{round.id}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <span className="font-mono text-[10px] text-white/60 truncate">{round.publicHash}</span>
                        <Copy className="w-3 h-3 text-white/20 cursor-pointer hover:text-primary" onClick={() => {
                          navigator.clipboard.writeText(round.publicHash);
                          toast({ title: "Hash Copied" });
                        }} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {round.status === 'FINISHED' ? (
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <span className="font-mono text-[10px] text-primary truncate">{round.serverSeed}</span>
                          <Copy className="w-3 h-3 text-primary/40 cursor-pointer hover:text-primary" onClick={() => {
                            navigator.clipboard.writeText(round.serverSeed || "");
                            toast({ title: "Seed Copied" });
                          }} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Hidden</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                        round.status === 'FINISHED' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/40'
                      }`}>
                        {round.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card neon-border rounded-[2rem] p-8 space-y-6">
          <h2 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" /> Manual Verification
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Server Seed</label>
              <input 
                value={manualSeed}
                onChange={(e) => setManualSeed(e.target.value)}
                placeholder="Enter server seed..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Expected Public Hash</label>
              <input 
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                placeholder="Enter public hash..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-primary/50"
              />
            </div>
            
            {manualSeed && manualHash && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs ${
                  verifySeed(manualSeed, manualHash) 
                    ? 'bg-primary/20 border-primary/40 text-primary' 
                    : 'bg-red-500/20 border-red-500/40 text-red-500'
                }`}
              >
                {verifySeed(manualSeed, manualHash) ? (
                  <>
                    <Check className="w-4 h-4" /> Valid Verification
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Invalid Verification
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
