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
    
    const normalizedPath = soundPath.startsWith('/') ? soundPath : `/${soundPath}`;
    
    console.log(`[Sound] Attempting to play: ${normalizedPath}`);
    try {
      const audio = new Audio(normalizedPath);
      audio.volume = volume;
      
      // Attempt immediate play
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn(`[Sound] Blocked or error for: ${normalizedPath}`, err);
          // If blocked, we try to unlock on the NEXT global click as a backup
          const forceUnlock = () => {
            const retryAudio = new Audio(normalizedPath);
            retryAudio.volume = volume;
            retryAudio.play().catch(() => {});
            window.removeEventListener('click', forceUnlock);
          };
          window.addEventListener('click', forceUnlock);
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
