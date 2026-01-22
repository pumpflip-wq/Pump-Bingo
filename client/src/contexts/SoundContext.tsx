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

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const playSound = (soundPath: string, volume = 0.5) => {
    if (isMuted) return;
    
    const audio = new Audio(soundPath);
    audio.volume = volume;
    
    const play = () => {
      audio.play().catch(err => {
        console.warn("Playback failed:", soundPath, err);
      });
    };

    if (hasInteracted) {
      play();
    } else {
      const playOnInteraction = () => {
        play();
        window.removeEventListener('mousedown', playOnInteraction);
        window.removeEventListener('keydown', playOnInteraction);
        window.removeEventListener('touchstart', playOnInteraction);
      };
      window.addEventListener('mousedown', playOnInteraction);
      window.addEventListener('keydown', playOnInteraction);
      window.addEventListener('touchstart', playOnInteraction);
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
