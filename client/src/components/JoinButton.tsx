import { useJoinRound } from "@/hooks/use-game";
import { useGameState } from "@/hooks/useGameState";
import { CyberButton } from "@/components/ui/CyberButton";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { PROTOCOL_CONFIG } from "@shared/config";
import { useSound } from "@/contexts/SoundContext";

interface JoinButtonProps {
  roundId: number;
  price: number;
  userId: number;
}

export function JoinButton({ roundId, price, userId }: JoinButtonProps) {
  const { mutate: joinRound, isPending } = useJoinRound();
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { playSound } = useSound();

  const { roundData } = useGameState();
  const isWinnerDeclared = !!roundData?.round.winnerId;

  const handleJoin = async () => {
    if (isWinnerDeclared) return;
    if (!publicKey || !userId) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Solana Transaction (Buy-in) - DISABLED FOR TESTING
      let signature = "TEST_TX_SIG_" + Date.now();
      
      const USE_REAL_SOLANA = false; // Toggle for testing

      if (USE_REAL_SOLANA) {
        const treasury = new PublicKey("DajB37qp74UzwND3N1rVWtLdxr55nhvuK2D4x476zmns");
        const lamports = price * 1000000;

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: treasury,
            lamports,
          })
        );

        signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");
      }

      // 2. Join Round with Tx Signature (Mocked if disabled)
      joinRound(
        { roundId, userId, txSignature: signature },
        {
          onSuccess: () => {
            toast({
              title: "Successfully Joined",
              description: "Transaction confirmed and you've entered the round!",
            });
            // Play sound - Use SoundContext
            playSound("/sounds/join.mp3", 0.5);
          },
          onError: (error: Error) => {
            toast({
              title: "Failed to Join",
              description: error.message || "Could not join the round.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message || "Solana transaction was cancelled or failed.",
        variant: "destructive",
      });
    }
  };

  const [timeRemaining, setTimeRemaining] = useState(10);

  useEffect(() => {
    if (!isWinnerDeclared) return;
    
    // Find when the winner was declared
    const winnerDeclaredAt = roundData?.round.completedAt ? new Date(roundData.round.completedAt).getTime() : Date.now();
    
    const updateTimer = () => {
      const elapsed = Date.now() - winnerDeclaredAt;
      const left = Math.max(0, Math.ceil((10000 - elapsed) / 1000));
      setTimeRemaining(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isWinnerDeclared, roundData?.round.completedAt]);

  if (isWinnerDeclared) {
    return (
      <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl w-full">
        <p className="text-primary font-black text-3xl italic tracking-tighter mb-1 uppercase text-center">GAME OVER!</p>
        <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest text-center whitespace-nowrap">
          Next Round in {timeRemaining}s
        </p>
      </div>
    );
  }

  return (
    <CyberButton
      onClick={handleJoin}
      disabled={isPending || !userId}
      className="w-full h-16 text-xl"
      data-testid="button-join-round"
    >
      {isPending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          JOINING...
        </>
      ) : (
        <>JOIN GAME - {price} PUMP</>
      )}
    </CyberButton>
  );
}
