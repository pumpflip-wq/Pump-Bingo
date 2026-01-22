import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface LastCalledNumberProps {
  numbers: number[];
}

export function LastCalledNumber({ numbers }: LastCalledNumberProps) {
  const lastNumber = numbers.length > 0 ? numbers[numbers.length - 1] : null;
  const { playSound } = useSound();
  const [prevNumbersCount, setPrevNumbersCount] = useState(numbers.length);

  useEffect(() => {
    if (numbers.length > prevNumbersCount) {
      playSound("/sounds/tick.mp3", 0.4);
      setPrevNumbersCount(numbers.length);
    }
  }, [numbers.length, prevNumbersCount, playSound]);

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white uppercase font-black tracking-widest font-display">Live Feed</span>
      </div>

      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Professional Gaming Ring Effects */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-primary/20"
        />
        
        {/* Glow and Pulse Base */}
        <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-xl border border-primary/30 shadow-[0_0_40px_rgba(57,255,20,0.15)] flex items-center justify-center">
          <div className="absolute inset-2 rounded-full border border-white/5 bg-gradient-to-br from-primary/5 to-transparent" />
        </div>
        
        <AnimatePresence mode="popLayout">
          {lastNumber !== null ? (
            <motion.div
              key={lastNumber}
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="z-10 flex flex-col items-center"
            >
              <div className="text-6xl font-black font-display text-primary italic leading-none drop-shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                {lastNumber}
              </div>
            </motion.div>
          ) : (
            <div className="z-10 flex items-center justify-center w-full h-full relative overflow-hidden rounded-full">
              {/* Bingo Cage Simulation */}
              <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative w-20 h-20"
              >
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      x: [0, Math.cos(i * (Math.PI / 2)) * 30, 0],
                      y: [0, Math.sin(i * (Math.PI / 2)) * 30, 0],
                      rotate: [0, 360],
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: "linear",
                      delay: i * 1.5
                    }}
                    className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-white via-primary/40 to-primary/80 border border-white/20 shadow-lg flex items-center justify-center overflow-hidden"
                    style={{
                      left: '35%',
                      top: '35%',
                    }}
                  >
                    <span className="text-[8px] font-black text-black">?</span>
                  </motion.div>
                ))}
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center pointer-events-none">
                <span className="text-[8px] font-black text-primary uppercase tracking-widest animate-pulse mt-12">Shuffling...</span>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* History indicator */}
      {numbers.length > 1 && (
        <div className="flex gap-1.5">
           {numbers.slice(-6, -1).reverse().map((n, i) => (
             <div key={i} className="w-8 h-8 rounded-full bg-black/40 border border-primary/30 flex items-center justify-center text-[10px] font-black text-primary italic shadow-lg">
               {n}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
