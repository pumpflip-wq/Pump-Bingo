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
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);

  useEffect(() => {
    const checkInteracted = () => {
      setHasInteracted(true);
      setShowUnlockPrompt(false);
      window.removeEventListener('click', checkInteracted);
      window.removeEventListener('keydown', checkInteracted);
    };
    window.addEventListener('click', checkInteracted);
    window.addEventListener('keydown', checkInteracted);
    
    // Show prompt if no interaction after 2 seconds
    const timer = setTimeout(() => {
      if (!hasInteracted) setShowUnlockPrompt(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', checkInteracted);
      window.removeEventListener('keydown', checkInteracted);
    };
  }, [hasInteracted]);

  const playSound = (soundPath: string, volume = 0.5) => {
    if (isMuted) return;
    
    try {
      const audio = new Audio(soundPath);
      audio.volume = volume;
      audio.play().catch(err => {
        console.warn("Playback blocked:", soundPath);
        if (!hasInteracted) setShowUnlockPrompt(true);
      });
    } catch (e) {
      console.warn("Sound error:", e);
    }
  };

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound }}>
      {children}
      {showUnlockPrompt && (
        <div className="fixed bottom-4 right-4 z-[200] animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-primary text-black px-6 py-3 rounded-full font-black italic tracking-tighter shadow-[0_0_30px_rgba(57,255,20,0.4)] flex items-center gap-3 border-2 border-white/20">
            <span className="text-xs uppercase tracking-widest not-italic">Click anywhere to enable sounds</span>
            <button onClick={() => {setHasInteracted(true); setShowUnlockPrompt(false);}} className="bg-black text-white px-3 py-1 rounded-lg text-[10px] uppercase font-black">Got it</button>
          </div>
        </div>
      )}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within SoundProvider');
  return context;
}
