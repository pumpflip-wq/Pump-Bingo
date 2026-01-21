import { ShieldCheck, Zap, Globe, Github } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img 
                src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                alt="PUMP BINGO" 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-black italic tracking-tighter text-white">
              PUMP <span className="text-primary">BINGO</span>
            </h2>
          </div>
          <p className="text-xs text-white/40 uppercase font-black tracking-widest leading-relaxed">
            The first provably fair bingo game on Solana. Decentralized, transparent, and built for the community.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs uppercase font-black tracking-[0.2em] text-white">Resources</h3>
          <nav className="flex flex-col space-y-2">
            <Link href="/verify" className="text-xs font-black uppercase tracking-widest text-white/60 hover:text-primary transition-colors flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" /> Provably Fair Verification
            </Link>
            <a href={`https://solscan.io/token/${PROTOCOL_CONFIG.MINT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase tracking-widest text-white/60 hover:text-primary transition-colors flex items-center gap-2">
              <Zap className="w-3 h-3" /> Token Contract
            </a>
          </nav>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs uppercase font-black tracking-[0.2em] text-white">Community</h3>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 transition-all">
              <Zap className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 transition-all">
              <Globe className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      
      <div className="mt-10 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">
          © 2026 PUMP BINGO. ALL RIGHTS RESERVED.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/verify" className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20 hover:text-primary transition-colors">
            Security & Fairness
          </Link>
          <span className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">
            Mainnet Beta
          </span>
        </div>
      </div>
    </footer>
  );
}
