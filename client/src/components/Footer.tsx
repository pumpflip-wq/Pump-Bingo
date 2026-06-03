import { ShieldCheck, History } from "lucide-react";
import { SiX } from "react-icons/si";
import { PROTOCOL_CONFIG } from "@shared/config";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full py-4 border-t border-white/8 bg-black/50 backdrop-blur-sm">
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Left — Logo + tagline */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
            <img src="/logo.png" alt="PUMP BINGO" className="w-9 h-9 object-cover rounded-lg" />
            <div className="flex flex-col">
              <span className="text-base font-black italic tracking-tight text-white leading-none">
                PUMP <span className="text-primary">BINGO</span>
              </span>
              <span className="text-[10px] text-white/35 uppercase font-bold tracking-widest leading-none mt-0.5">
                Provably Fair · Solana
              </span>
            </div>
          </Link>

          {/* Center — Nav links */}
          <nav className="flex items-center gap-5">
            <Link href="/history" className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-primary transition-colors flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" /> History
            </Link>
            <Link href="/verify" className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-primary transition-colors flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verify
            </Link>
          </nav>

          {/* Right — Socials + copyright */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <a
                href={`${PROTOCOL_CONFIG.PUMP_FUN_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`}
                target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/18 transition-all flex items-center justify-center border border-white/10"
                title="Trade on Pump.fun"
              >
                <img src="https://pump.fun/favicon.ico" className="w-4 h-4 object-contain" alt="Pump.fun" />
              </a>
              <a
                href={`${PROTOCOL_CONFIG.DEXSCANNER_URL}${PROTOCOL_CONFIG.MINT_ADDRESS}`}
                target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/18 transition-all flex items-center justify-center border border-white/10"
                title="Chart on Dexscreener"
              >
                <img src="https://dexscreener.com/favicon.png" className="w-4 h-4 object-contain" alt="Dexscreener" />
              </a>
              <a
                href={PROTOCOL_CONFIG.TWITTER_URL}
                target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/18 transition-all flex items-center justify-center border border-white/10 text-white/50 hover:text-primary"
                title="Follow on X"
              >
                <SiX className="w-3.5 h-3.5" />
              </a>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
              © 2026 Pump Bingo · Mainnet Beta
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
}
