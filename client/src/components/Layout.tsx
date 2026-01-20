import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { CyberButton } from "./ui/CyberButton";
import { Wallet, Trophy, LogOut } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-primary selection:text-black flex flex-col">
      {/* Matrix-like subtle background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.1),transparent_70%)] pointer-events-none z-0" />

      {/* Header */}
      {/* Removed local header to avoid duplicates with App.tsx */}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-auto relative z-10 bg-black">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p className="font-display">© 2025 PUMP BINGO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="hover:text-primary cursor-pointer transition-colors">FAIRNESS</span>
            <span className="hover:text-primary cursor-pointer transition-colors">RULES</span>
            <span className="hover:text-primary cursor-pointer transition-colors">SUPPORT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
