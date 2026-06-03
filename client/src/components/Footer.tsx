import { ShieldCheck, History } from "lucide-react";
import { SiX } from "react-icons/si";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full py-3 border-t border-white/5 bg-black/40">
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="PUMP BINGO" className="w-7 h-7 object-cover" />
              <h2 className="text-sm font-black italic tracking-tighter text-white">
                PUMP <span className="text-primary">BINGO</span>
              </h2>
            </Link>
            <span className="hidden sm:block text-white/20 text-xs">·</span>
            <p className="hidden sm:block text-[9px] text-white/35 uppercase font-black tracking-widest">
              Provably fair bingo on Solana
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <nav className="flex items-center gap-4">
              <Link href="/history" className="text-[10px] font-black uppercase tracking-widest text-white/45 hover:text-primary transition-colors flex items-center gap-1.5">
                <History className="w-3 h-3 text-primary" /> History
              </Link>
              <Link href="/verify" className="text-[10px] font-black uppercase tracking-widest text-white/45 hover:text-primary transition-colors flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-primary" /> Verify
              </Link>
            </nav>

            <div className="flex items-center gap-1.5">
              <a
                href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`}
                target="_blank" rel="noopener noreferrer"
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
                title="Trade on Pump.fun"
              >
                <img src="https://pump.fun/favicon.ico" className="w-3.5 h-3.5 object-contain" alt="Pump.fun" />
              </a>
              <a
                href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`}
                target="_blank" rel="noopener noreferrer"
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
                title="Chart on Dexscreener"
              >
                <img src="https://dexscreener.com/favicon.png" className="w-3.5 h-3.5 object-contain" alt="Dexscreener" />
              </a>
              <a
                href={PROTOCOL_CONFIG.TWITTER_URL}
                target="_blank" rel="noopener noreferrer"
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 text-white/60 hover:text-primary"
                title="Follow on X"
              >
                <SiX className="w-3 h-3" />
              </a>
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/25">
              © 2026 PUMP BINGO · Mainnet Beta
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
