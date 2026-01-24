import { useState, useEffect } from "react";
import { cn, formatAddress, formatCurrency } from "@/lib/utils";
import { useJoinRound } from "@/hooks/use-game";
import { useGameState } from "@/hooks/useGameState";
import { CyberButton } from "@/components/ui/CyberButton";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { PROTOCOL_CONFIG } from "@shared/config";

interface JoinButtonProps {
  roundId: number;
  price: number;
  userId: number;
  className?: string;
}

export function JoinButton({ roundId, price, userId, className }: JoinButtonProps) {
  const { mutate: joinRound, isPending } = useJoinRound();
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

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
      const USE_REAL_SOLANA = PROTOCOL_CONFIG.NETWORK === "devnet" && !PROTOCOL_CONFIG.IS_TEST_MODE;
      let signature = "TEST_TX_SIG_" + Date.now();

      if (USE_REAL_SOLANA) {
        // Optimization: Hardcode the master wallet if it's stable, or at least start the transaction faster
        // The admin/stats fetch was adding a network roundtrip before the wallet popup
        const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET); 
        const lamports = price;

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: treasury,
            lamports,
          })
        );

        // Get the latest blockhash in parallel or just before sending to minimize delay
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        signature = await sendTransaction(transaction, connection);
        
        // Don't await full confirmation before calling joinRound to make UI feel instant
        connection.confirmTransaction(signature, "confirmed").catch(console.error);
      }

      // 2. Join Round with Tx Signature
      joinRound(
        { roundId, userId, txSignature: signature },
        {
          onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
          queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
          queryClient.invalidateQueries({ queryKey: [api.participants.get.path, roundId, userId] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

            toast({
              title: "Successfully Joined",
              description: "Transaction sent! You've entered the round.",
            });
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
      <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl w-full h-16 flex flex-col items-center justify-center">
        <p className="text-primary font-black text-2xl italic tracking-tighter mb-0 uppercase text-center">GAME OVER!</p>
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
      className={cn("w-full h-16 text-3xl font-black italic tracking-tighter uppercase", className)}
      data-testid="button-join-round"
    >
      {isPending ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>JOINING...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <span>JOIN GAME -</span>
          <span className="text-3xl text-black font-black">{(price / 1e9).toString()} SOL</span>
        </div>
      )}
    </CyberButton>
  );
}
