import { createContext, useContext, useCallback, useRef, ReactNode } from 'react';

interface SoundContextType {
  playSound: (src: string, volume?: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((src: string, volume: number = 1) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      const audio = new Audio(src);
      audio.volume = Math.max(0, Math.min(1, volume));
      audioRef.current = audio;
      
      audio.play().catch(() => {
      });
    } catch {
    }
  }, []);

  return (
    <SoundContext.Provider value={{ playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextType {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
