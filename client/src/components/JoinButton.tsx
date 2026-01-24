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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

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

  const { user } = useGameState();
  const [isWalleting, setIsWalleting] = useState(false);

  const handleJoin = async () => {
    if (isWinnerDeclared || isWalleting) return;
    if (!publicKey || !userId) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    if (user && user.balance < price) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${(price / 1e9).toFixed(2)} SOL to join.`,
        variant: "destructive",
      });
      return;
    }

    setIsWalleting(true);
    try {
      const USE_REAL_SOLANA = PROTOCOL_CONFIG.NETWORK === "devnet" && !PROTOCOL_CONFIG.IS_TEST_MODE;
      let signature = "TEST_TX_SIG_" + Date.now();

      if (USE_REAL_SOLANA) {
        const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET); 
        const lamports = price;

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: treasury,
            lamports,
          })
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        signature = await sendTransaction(transaction, connection, { preflightCommitment: 'processed' });
        
        // Background confirmation
        connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, "processed").catch(console.error);
      }

      // 1. Create a payment record in the queue BEFORE joining
      // This ensures that even if the server restarts or join fails, the payment is logged
      await apiRequest("POST", "/api/payments/queue", {
        userId,
        amount: price,
        txSignature: signature
      });

      // 2. Proceed with optimistic join
      queryClient.setQueryData([api.rounds.get.path, roundId], (old: any) => {
        if (!old) return old;
        const exists = old.participants?.some((p: any) => p.username === publicKey.toBase58());
        if (exists) return old;

        return {
          ...old,
          participantsCount: (old.participantsCount || 0) + 1,
          participants: [
            ...(old.participants || []),
            { id: 'optimistic-' + Date.now(), username: publicKey.toBase58(), joinedAt: new Date().toISOString(), card: [] }
          ]
        };
      });

      joinRound(
        { roundId, userId, txSignature: signature },
        {
          onSuccess: (data) => {
            setIsWalleting(false);
            // Update cache with real data immediately
            queryClient.setQueryData([api.rounds.get.path, roundId], (old: any) => {
              if (!old) return old;
              // Remove the optimistic participant and add the real one
              const participants = (old.participants || []).filter((p: any) => !p.id?.toString().startsWith('optimistic-'));
              const exists = participants.some((p: any) => p.username === publicKey.toBase58());
              if (!exists && data.participant) {
                participants.push(data.participant);
              }
              return {
                ...old,
                participants,
                participantsCount: participants.length
              };
            });
            
            toast({
              title: "Successfully Joined",
              description: "Transaction sent! You've entered the round.",
            });
          },
          onError: (error: Error) => {
            setIsWalleting(false);
            // Remove optimistic update on error
            queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
            toast({
              title: "Join Process Initiated",
              description: "Transaction sent. If the round started already, you will be added to the next one automatically.",
            });
          },
        }
      );
    } catch (error: any) {
      setIsWalleting(false);
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
      disabled={isPending || isWalleting || !userId}
      className={cn(
        "w-full h-16 text-3xl font-black italic tracking-tighter uppercase transition-all active:scale-95 active:brightness-90",
        className
      )}
      data-testid="button-join-round"
    >
      {isPending || isWalleting ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{isWalleting ? 'WAITING FOR WALLET...' : 'JOINING...'}</span>
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
