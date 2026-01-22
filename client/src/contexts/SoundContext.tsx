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

  const playSound = (soundPath: string, volume = 0.5) => {
    if (isMuted) {
      console.log("Sound muted, skipping:", soundPath);
      return;
    }
    
    // Create audio once to help with browser caching and performance
    const audio = new Audio(soundPath);
    audio.volume = volume;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        // Fallback for autoplay policy - most browsers allow audio after first interaction
        console.warn("Autoplay prevented sound. Retrying on next interaction:", soundPath, err);
        const retryOnInteraction = () => {
          audio.play().catch(() => {});
          window.removeEventListener('click', retryOnInteraction);
          window.removeEventListener('keydown', retryOnInteraction);
        };
        window.addEventListener('click', retryOnInteraction, { once: true });
        window.addEventListener('keydown', retryOnInteraction, { once: true });
      });
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
