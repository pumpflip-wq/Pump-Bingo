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
    if (isMuted) return;
    
    // Ensure sound path is correct (remove leading slash if it exists for relative resolution)
    const normalizedPath = soundPath.startsWith('/') ? soundPath : `/${soundPath}`;
    
    console.log(`[Sound] Attempting to play: ${normalizedPath}`);
    try {
      const audio = new Audio(normalizedPath);
      audio.volume = volume;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`[Sound] Success: ${normalizedPath}`);
        }).catch(err => {
          if (err.name === 'NotAllowedError') {
            console.warn(`[Sound] Autoplay blocked for: ${normalizedPath}`);
          } else {
            console.error(`[Sound] Playback error for: ${normalizedPath}`, err);
          }
        });
      }
    } catch (e) {
      console.error(`[Sound] Creation error: ${normalizedPath}`, e);
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
