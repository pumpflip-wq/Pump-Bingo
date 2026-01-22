import { ShieldCheck, Zap, Globe, ShoppingCart, Twitter, History } from "lucide-react";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full pt-10 pb-6 border-t border-white/5 bg-black/40">
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
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
              <Link href="/history" className="text-[11px] font-black uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-primary" /> History
              </Link>
              <Link href="/verify" className="text-[11px] font-black uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verify
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <a 
                href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 shadow-sm"
                title="Trade on Pump.fun"
              >
                <img src="https://pump.fun/favicon.ico" className="w-6 h-6 object-contain" alt="Pump.fun" />
              </a>
              <a 
                href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 shadow-sm"
                title="Chart on Dexscreener"
              >
                <img src="https://dexscreener.com/favicon.png" className="w-6 h-6 object-contain" alt="Dexscreener" />
              </a>
              <a 
                href={PROTOCOL_CONFIG.TWITTER_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] transition-all flex items-center justify-center border border-white/20 shadow-sm text-white hover:text-[#1DA1F2]"
                title="Follow on X"
              >
                <Twitter className="w-5 h-5 fill-current" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60">
            © 2026 PUMP BINGO. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60">
              Mainnet Beta
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
