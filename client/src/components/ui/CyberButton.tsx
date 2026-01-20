import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
}

const CyberButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    
    const baseStyles = "relative inline-flex items-center justify-center font-display uppercase tracking-[0.1em] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-0 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.97] overflow-hidden group";
    
    const variants = {
      primary: "bg-primary text-black font-black italic shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_40px_rgba(57,255,20,0.5)] border-2 border-transparent",
      secondary: "bg-[#9d00ff] text-white font-black italic shadow-[0_0_20px_rgba(157,0,255,0.3)] hover:shadow-[0_0_40px_rgba(157,0,255,0.5)] border-2 border-transparent",
      outline: "bg-transparent text-primary font-bold border-2 border-primary/50 hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(57,255,20,0.2)]",
      danger: "bg-destructive text-white font-bold border-2 border-transparent hover:bg-destructive/90 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",
      ghost: "bg-transparent text-muted-foreground font-bold hover:text-primary hover:bg-primary/5 border-2 border-transparent",
    };

    const sizes = {
      sm: "h-9 px-4 text-[10px]",
      md: "h-12 px-7 text-xs font-black",
      lg: "h-14 px-9 text-base font-black",
      xl: "h-20 px-12 text-2xl font-black italic tracking-tighter",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {/* Background glow animation */}
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Scanning line for primary buttons */}
        {variant === 'primary' && (
          <div className="absolute inset-0 w-full h-1 bg-white/30 -top-full group-hover:top-full transition-all duration-700 ease-in-out pointer-events-none" />
        )}
        
        {/* Decorative corner accents */}
        {variant !== 'ghost' && (
          <>
            <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/40" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/40" />
          </>
        )}
        
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    )
  }
)
CyberButton.displayName = "CyberButton"

export { CyberButton }
