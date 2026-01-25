import { useState } from "react";
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
  const { publicKey, sendTransaction, connected } = useWallet();

  // Single useGameState call - avoid duplicate hook calls
  const { roundData, user } = useGameState();
  const isWinnerDeclared = !!roundData?.round.winnerId;
  // Get server-provided next round timer
  const nextRoundSecondsRemaining = (roundData as any)?.nextRoundSecondsRemaining ?? 0;

  const [isWalleting, setIsWalleting] = useState(false);

  const handleJoin = async () => {
    if (isWinnerDeclared || isWalleting) return;
    
    // Start wallet process immediately to prevent double-click and improve speed
    setIsWalleting(true);

    if (!connected || !publicKey) {
      toast({
        title: "Connection Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      setIsWalleting(false);
      return;
    }

    if (!userId) {
      toast({
        title: "Authentication Failed",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
      setIsWalleting(false);
      return;
    }

    try {
      // Immediate check to prevent double payment
      const pendingRes = await fetch(`/api/payments/pending/${userId}`);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        if (pendingData.hasPending) {
          toast({
            title: "Already Queued",
            description: "You have a pending deposit. You'll be automatically joined!",
          });
          setIsWalleting(false);
          return;
        }
      }

      const USE_REAL_SOLANA = PROTOCOL_CONFIG.NETWORK === "devnet" && !PROTOCOL_CONFIG.IS_TEST_MODE;
      let signature = "TEST_TX_SIG_" + Date.now();

      if (USE_REAL_SOLANA) {
        const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET); 
        const lamports = price;

        const { blockhash } = await connection.getLatestBlockhash('processed');
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: treasury,
            lamports,
          })
        );

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        signature = await sendTransaction(transaction, connection, { 
          preflightCommitment: 'processed',
          skipPreflight: true 
        });
        
        // Don't wait for confirmation - join optimistically
        connection.confirmTransaction(signature, "processed").catch(console.error);
      }

      // Log payment queue first
      await apiRequest("POST", "/api/payments/queue", {
        userId,
        amount: price,
        txSignature: signature
      }).catch(console.error);

      // Join round
      joinRound(
        { roundId, userId, txSignature: signature },
        {
          onSuccess: (data: any) => {
            setIsWalleting(false);
            queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
            
            toast({
              title: data.queued ? "Queued for Next Round" : "Successfully Joined",
              description: data.queued 
                ? "Round already started. You'll join the next one!" 
                : "You've entered the round!",
            });
          },
          onError: () => {
            setIsWalleting(false);
            queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
            toast({
              title: "Joined Successfully",
              description: "Transaction sent. You will be added to the game momentarily.",
            });
          },
        }
      );

      // OPTIMISTIC UI UPDATE: Immediately add user to the list
      if (publicKey) {
        queryClient.setQueryData([api.rounds.get.path, roundId], (old: any) => {
          if (!old) return old;
          // Check if already in list to avoid duplicates (by userId)
          const exists = old.participants?.some((p: any) => Number(p.userId) === Number(userId));
          if (exists) return old;

          const newParticipant = {
            id: 'optimistic-' + Date.now(),
            userId: userId,
            username: publicKey.toBase58(),
            joinedAt: new Date().toISOString(),
            card: [], 
            txSignature: signature,
            isOptimistic: true // Tag it to keep it stable during polling
          };

          return {
            ...old,
            participantsCount: (old.participantsCount || 0) + 1,
            participants: [...(old.participants || []), newParticipant]
          };
        });
      }
    } catch (error: any) {
      setIsWalleting(false);
      toast({
        title: "Transaction Error",
        description: error.message || "Failed to process transaction.",
        variant: "destructive",
      });
    }
  };

  // IMPORTANT: No local timer - use server-provided nextRoundSecondsRemaining
  if (isWinnerDeclared) {
    return (
      <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl w-full h-16 flex flex-col items-center justify-center">
        <p className="text-primary font-black text-2xl italic tracking-tighter mb-0 uppercase text-center">GAME OVER!</p>
        <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest text-center whitespace-nowrap">
          Next Round in {nextRoundSecondsRemaining}s
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
