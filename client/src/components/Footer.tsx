import { ShieldCheck, Zap, Globe, Github } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full py-8 border-t border-white/5 bg-black/40">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20">
                <img 
                  src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                  alt="PUMP BINGO" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-lg font-black italic tracking-tighter text-white">
                PUMP <span className="text-primary">BINGO</span>
              </h2>
            </div>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest max-w-xs text-center md:text-left">
              The first provably fair bingo game on Solana. Decentralized and transparent.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <nav className="flex items-center gap-6">
              <Link href="/verify" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary transition-colors flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-primary" /> Verify
              </Link>
              <a href={`https://solscan.io/token/${PROTOCOL_CONFIG.MINT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-primary transition-colors flex items-center gap-2">
                <Zap className="w-3 h-3 text-primary" /> Contract
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/50 transition-all">
                <Zap className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/50 transition-all">
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20">
            © 2026 PUMP BINGO. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/verify" className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20 hover:text-primary transition-colors">
              Security
            </Link>
            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20">
              Mainnet Beta
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
