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

  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unlock = () => {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhAAQACABAAAABkYXRhAgAAAAEA'; // Tiny silent wav
      audio.play().then(() => {
        setIsUnlocked(true);
        console.log("[Sound] Audio context unlocked globally");
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
      }).catch(() => {});
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const playSound = (soundPath: string, volume = 0.5) => {
    if (isMuted) return;
    
    const normalizedPath = soundPath.startsWith('/') ? soundPath : `/${soundPath}`;
    
    try {
      const audio = new Audio(normalizedPath);
      audio.volume = volume;
      // Preload the audio to help with the "deferred" issues
      audio.load();
      audio.play().catch(err => {
        console.warn(`[Sound] Playback deferred for: ${normalizedPath}`, err);
        // Retry play on next user interaction if it failed due to context
        const resumePlay = () => {
          audio.play().catch(() => {});
          window.removeEventListener('click', resumePlay);
        };
        window.addEventListener('click', resumePlay);
      });
    } catch (e) {}
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
