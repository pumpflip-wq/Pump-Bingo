import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CyberButton } from "./ui/CyberButton";
import { ShieldAlert, CheckCircle2, Scale, Info } from "lucide-react";

interface TermsModalProps {
  onAccept: () => void;
  show?: boolean;
}

export function TermsModal({ onAccept, show = false }: TermsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    console.log(`[TermsModal] Visibility Check - Show Prop: ${show}`);
    if (show) {
      const timer = setTimeout(() => setIsOpen(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
    }
  }, [show]);

  const handleAccept = () => {
    console.log("[TermsModal] Accepting terms");
    onAccept();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-2xl bg-card border-2 border-primary/30 rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_100px_rgba(57,255,20,0.1)]"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Age Verification & Terms</h2>
                  <p className="text-xs text-primary font-black uppercase tracking-[0.2em]">Restricted Access Area</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div 
              className="flex-1 overflow-y-auto p-8 space-y-6 font-mono text-sm text-white/70 leading-relaxed"
              onScroll={handleScroll}
            >
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>1. Age Requirement</span>
                </div>
                <p>
                  By entering PUMP BINGO, you certify that you are at least 18 years of age (or the legal age for gambling in your jurisdiction). This platform involves real-time gaming with digital assets.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                  <Scale className="w-4 h-4 text-primary" />
                  <span>2. Legal Disclaimer</span>
                </div>
                <p>
                  The services provided are on an "as-is" basis. We do not guarantee winnings. Participation in bingo rounds is voluntary. You agree that PUMP BINGO and its affiliates are not liable for any financial losses incurred through the use of this platform.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
                  <Info className="w-4 h-4 text-primary" />
                  <span>3. Provably Fair System</span>
                </div>
                <p>
                  All games are governed by our Provably Fair cryptographic system. You can verify the integrity of every round using the provided hashes and server seeds. Manipulation or abuse of the system will result in permanent ban and forfeiture of assets.
                </p>
              </section>

              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-[10px] uppercase font-black tracking-widest text-primary leading-loose">
                NOTICE: CONTINUING BEYOND THIS POINT CONSTITUTES FULL AGREEMENT TO THE TERMS LISTED ABOVE AND UNLOCKS ALL SYSTEM CAPABILITIES.
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-white/10 bg-black/40 flex flex-col gap-4">
              {!hasScrolledToBottom && (
                <p className="text-center text-[10px] text-white/40 uppercase font-black animate-pulse">
                  Please scroll down to read all terms
                </p>
              )}
              <CyberButton
                onClick={handleAccept}
                disabled={!hasScrolledToBottom}
                variant="primary"
                className="w-full h-16 text-xl font-black italic tracking-tighter"
              >
                I AGREE & ENTER SYSTEM
              </CyberButton>
              <p className="text-[10px] text-center text-white/30 uppercase font-black tracking-widest">
                Protected by military-grade encryption & provably fair protocols
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
