import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSound } from "@/contexts/SoundContext";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { isMuted, toggleMute } = useSound();

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

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
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        data-testid="button-theme-toggle"
        className="h-9 w-9 rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
