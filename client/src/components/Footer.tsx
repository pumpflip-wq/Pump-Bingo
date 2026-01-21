import { ShieldCheck, Zap, Globe, Github } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 border-t border-white/10 bg-black/20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
              <img 
                src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                alt="PUMP BINGO" 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter text-white">
              PUMP <span className="text-primary">BINGO</span>
            </h2>
          </div>
          <p className="text-sm text-white/60 uppercase font-bold tracking-wider leading-relaxed max-w-sm">
            The first provably fair bingo game on Solana. Decentralized, transparent, and built for the community.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm uppercase font-black tracking-[0.2em] text-white">Resources</h3>
          <nav className="flex flex-col space-y-3">
            <Link href="/verify" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-primary transition-colors flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-primary" /> Provably Fair Verification
            </Link>
            <a href={`https://solscan.io/token/${PROTOCOL_CONFIG.MINT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-primary transition-colors flex items-center gap-3">
              <Zap className="w-4 h-4 text-primary" /> Token Contract
            </a>
          </nav>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm uppercase font-black tracking-[0.2em] text-white">Community</h3>
          <div className="flex items-center gap-4">
            <a href="#" className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/80 hover:text-primary hover:border-primary/50 transition-all hover:bg-white/15">
              <Zap className="w-6 h-6" />
            </a>
            <a href="#" className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white/80 hover:text-primary hover:border-primary/50 transition-all hover:bg-white/15">
              <Globe className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
      
      <div className="mt-16 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-xs uppercase font-black tracking-[0.3em] text-white/40">
          © 2026 PUMP BINGO. ALL RIGHTS RESERVED.
        </p>
        <div className="flex items-center gap-8">
          <Link href="/verify" className="text-xs uppercase font-black tracking-[0.3em] text-white/40 hover:text-primary transition-colors">
            Security & Fairness
          </Link>
          <span className="text-xs uppercase font-black tracking-[0.3em] text-white/40">
            Mainnet Beta
          </span>
        </div>
      </div>
    </footer>
  );
}
