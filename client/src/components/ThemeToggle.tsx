import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSound } from "@/contexts/SoundContext";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { isMuted, toggleMute } = useSound();

  useEffect(() => {
    // Force dark theme globally
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        className="h-9 w-9 rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
