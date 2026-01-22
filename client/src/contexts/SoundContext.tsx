import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (soundPath: string, volume?: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('sound_muted');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sound_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  const toggleMute = () => setIsMuted(!isMuted);

  const [hasInteracted, setHasInteracted] = useState(false);

  const playSound = (soundPath: string, volume = 0.5) => {
    if (isMuted) return;
    
    console.log(`[Sound] Playing: ${soundPath}`);
    try {
      const audio = new Audio(soundPath);
      audio.volume = volume;
      audio.play().then(() => {
        console.log(`[Sound] Success: ${soundPath}`);
      }).catch(err => {
        console.error(`[Sound] Blocked: ${soundPath}`, err);
      });
    } catch (e) {
      console.error(`[Sound] Error: ${soundPath}`, e);
    }
  };

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within SoundProvider');
  return context;
}
