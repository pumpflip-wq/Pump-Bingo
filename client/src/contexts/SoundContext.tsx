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

  useEffect(() => {
    // Global listener to unlock audio on first interaction
    const unlockAudio = () => {
      setHasInteracted(true);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const playSound = (soundPath: string, volume = 0.5) => {
    if (isMuted) return;
    
    try {
      // Use a consistent audio object per path if possible, or new one
      const audio = new Audio(soundPath);
      audio.volume = volume;
      audio.preload = 'auto';
      
      const play = () => {
        audio.play().catch(err => {
          console.warn("Playback failed:", soundPath, err);
        });
      };

      // Try to play immediately, if blocked it will be handled by the interaction listeners
      if (hasInteracted) {
        play();
      } else {
        const unlockAndPlay = () => {
          setHasInteracted(true);
          play();
          window.removeEventListener('click', unlockAndPlay);
          window.removeEventListener('keydown', unlockAndPlay);
          window.removeEventListener('touchstart', unlockAndPlay);
        };
        window.addEventListener('click', unlockAndPlay);
        window.addEventListener('keydown', unlockAndPlay);
        window.addEventListener('touchstart', unlockAndPlay);
      }
    } catch (e) {
      console.warn("Sound play error:", e);
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
