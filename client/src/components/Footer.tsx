import { ShieldCheck, Zap, Globe, ShoppingCart, Twitter } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full py-8 border-t border-white/5 bg-black/40">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
              <img 
                src="https://i.ibb.co/JjHKRQhZ/Chat-GPT-Image-Jan-20-2026-11-15-29-PM.png" 
                alt="PUMP BINGO" 
                className="w-14 h-14 object-cover"
              />
              <h2 className="text-xl font-black italic tracking-tighter text-white">
                PUMP <span className="text-primary">BINGO</span>
              </h2>
            </Link>
            <p className="text-[11px] text-white/80 uppercase font-bold tracking-widest max-w-xs text-center md:text-left">
              The first provably fair bingo game on Solana. Decentralized and transparent.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <nav className="flex items-center gap-6">
              <Link href="/verify" className="text-[11px] font-black uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verify
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <a 
                href={`https://pump.fun/${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-primary border border-primary/20 flex items-center justify-center text-black hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                title="Buy PUMP"
              >
                <ShoppingCart className="w-4.5 h-4.5" />
              </a>
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:text-primary hover:border-primary/50 transition-all"
                title="Follow on X"
              >
                <Twitter className="w-4 h-4 fill-current" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60">
            © 2026 PUMP BINGO. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/verify" className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60 hover:text-primary transition-colors">
              Security
            </Link>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60">
              Mainnet Beta
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
