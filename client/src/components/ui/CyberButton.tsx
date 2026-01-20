import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
}

const CyberButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    
    const baseStyles = "relative inline-flex items-center justify-center font-display uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    
    const variants = {
      primary: "bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(57,255,20,0.4)] hover:shadow-[0_0_25px_rgba(57,255,20,0.6)] border-2 border-transparent",
      secondary: "bg-secondary text-white hover:bg-secondary/90 shadow-[0_0_15px_rgba(157,0,255,0.4)] hover:shadow-[0_0_25px_rgba(157,0,255,0.6)] border-2 border-transparent",
      outline: "bg-transparent text-primary border-2 border-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(57,255,20,0.2)]",
      danger: "bg-destructive text-white hover:bg-destructive/90 border-2 border-transparent",
      ghost: "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/5 border-2 border-transparent",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-12 px-6 text-sm font-bold",
      lg: "h-14 px-8 text-base font-bold",
      xl: "h-16 px-10 text-xl font-bold tracking-widest",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {/* Decorative corner accents for cyber feel */}
        {variant !== 'ghost' && (
          <>
            <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/30" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/30" />
          </>
        )}
        {children}
      </button>
    )
  }
)
CyberButton.displayName = "CyberButton"

export { CyberButton }
