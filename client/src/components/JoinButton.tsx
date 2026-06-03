import { useState } from "react";
import { cn, formatAddress, formatCurrency } from "@/lib/utils";
import { useJoinRound } from "@/hooks/use-game";
import { useGameState } from "@/hooks/useGameState";
import { CyberButton } from "@/components/ui/CyberButton";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferCheckedInstruction, getAccount } from "@solana/spl-token";
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

  const { roundData, user } = useGameState();
  const effectiveUserId = userId || user?.id;
  const isWinnerDeclared = !!roundData?.round.winnerId;
  const nextRoundSecondsRemaining = (roundData as any)?.nextRoundSecondsRemaining ?? 0;

  const [isWalleting, setIsWalleting] = useState(false);

  // Determine mode from the round price prop
  const isFreeMode = price === 0;

  const handleJoin = async () => {
    if (isWinnerDeclared || isWalleting) return;
    
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

    if (!effectiveUserId) {
      if (connected && publicKey) {
        const username = publicKey.toString();
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ username })
          });
          
          if (res.ok) {
            const newUser = await res.json();
            if (newUser && newUser.id) {
              queryClient.setQueryData(["/api/auth/me", newUser.id], newUser);
              queryClient.setQueryData(["/api/auth/me"], newUser);
              localStorage.setItem("pb_user_id", newUser.id.toString());
              handleJoinWithId(newUser.id);
              return;
            }
          }
        } catch (e) {
          console.error("[JoinButton] Auto-login error:", e);
        }
      }

      toast({
        title: "Authentication Failed",
        description: connected ? "User identification failed. Please refresh." : "Please connect your wallet.",
        variant: "destructive",
      });
      setIsWalleting(false);
      return;
    }

    handleJoinWithId(Number(effectiveUserId));
  };

  const handleJoinWithId = async (joinUserId: number) => {
    try {
      let signature = "";

      if (!isFreeMode) {
        // Check for existing pending payment
        const pendingRes = await fetch(`/api/payments/pending/${joinUserId}`);
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

        const isSPLMode = !!PROTOCOL_CONFIG.MINT_ADDRESS;

        if (PROTOCOL_CONFIG.NETWORK === "mainnet-beta") {
          if (isSPLMode) {
            const mint = new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS!);
            const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET);
            
            const userATA = await getAssociatedTokenAddress(mint, publicKey!);
            const treasuryATA = await getAssociatedTokenAddress(mint, treasury);

            try {
              const account = await getAccount(connection, userATA);
              if (Number(account.amount) < price) {
                throw new Error(`Insufficient ${PROTOCOL_CONFIG.SYMBOL} balance. You need ${price / 1e6} ${PROTOCOL_CONFIG.SYMBOL}.`);
              }
            } catch (e: any) {
              if (e.name === 'TokenAccountNotFoundError') {
                throw new Error(`You don't have a ${PROTOCOL_CONFIG.SYMBOL} token account. Buy tokens first.`);
              }
              throw new Error(e.message || `Could not verify ${PROTOCOL_CONFIG.SYMBOL} balance.`);
            }

            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            const transaction = new Transaction().add(
              createTransferCheckedInstruction(
                userATA,
                mint,
                treasuryATA,
                publicKey!,
                BigInt(price),
                PROTOCOL_CONFIG.DECIMALS
              )
            );
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey!;

            signature = await sendTransaction(transaction, connection, { preflightCommitment: 'confirmed' });
            await connection.confirmTransaction(signature, "confirmed");
          } else {
            const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET);
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: publicKey!,
                toPubkey: treasury,
                lamports: price,
              })
            );
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey!;
            signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
          }
        } else {
          // Devnet / staging — simulate payment
          signature = "TX_SIM_" + Date.now();
        }

        await apiRequest("POST", "/api/payments/queue", {
          userId: joinUserId,
          amount: price,
          txSignature: signature
        }).catch(console.error);
      } else {
        signature = "FREE_" + joinUserId + "_" + Date.now();
      }

      joinRound(
        { roundId, userId: joinUserId, txSignature: signature },
        {
          onSuccess: async (data: any) => {
            setIsWalleting(false);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId], refetchType: 'all' }),
              queryClient.invalidateQueries({ queryKey: [api.rounds.list.path], refetchType: 'all' }),
              queryClient.invalidateQueries({ queryKey: ["/api/auth/me"], refetchType: 'all' })
            ]);

            if (joinUserId) {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/me", joinUserId], refetchType: 'all' });
            }
            
            const isActuallyStarted = roundData?.round?.status === "IN_GAME" || roundData?.round?.status === "FINISHED";
            const showQueued = data.queued && isActuallyStarted;

            toast({
              title: showQueued ? "Queued for Next Round" : "Successfully Joined!",
              description: showQueued 
                ? "You've been added to the queue for the next game!" 
                : isFreeMode ? "You're in the game — good luck!" : `Entry of ${price / 1e6} ${PROTOCOL_CONFIG.SYMBOL} confirmed!`,
            });

            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
              queryClient.invalidateQueries({ queryKey: [api.rounds.list.path] });
            }, 500);
          },
          onError: (error: any) => {
            setIsWalleting(false);
            queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
            toast({
              title: "Join Error",
              description: error.message || "Failed to join the round. Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error: any) {
      setIsWalleting(false);
      toast({
        title: "Transaction Error",
        description: error.message || "Failed to process transaction.",
        variant: "destructive",
      });
    }
  };

  if (isWinnerDeclared) {
    return (
      <div className="p-8 bg-primary/10 border-2 border-primary/30 rounded-3xl w-full h-16 flex flex-col items-center justify-center">
        <p className="text-primary font-black text-2xl italic tracking-tighter mb-0 uppercase text-center">ROUND OVER!</p>
        <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest text-center whitespace-nowrap">
          Next Round in {nextRoundSecondsRemaining}s
        </p>
      </div>
    );
  }

  return (
    <CyberButton
      onClick={handleJoin}
      disabled={isPending || isWalleting || !connected}
      className={cn(
        "w-full h-16 text-3xl font-black italic tracking-tighter uppercase transition-all active:scale-95 active:brightness-90",
        className
      )}
      data-testid="button-join-round"
    >
      {isPending || isWalleting ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{isFreeMode ? 'JOINING...' : 'CONFIRM WALLET...'}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          {isFreeMode ? (
            <span>PLAY FOR FREE</span>
          ) : (
            <>
              <span>JOIN GAME</span>
              <span className="text-2xl text-black/80 font-black">— {formatCurrency(price, false)} {PROTOCOL_CONFIG.SYMBOL}</span>
            </>
          )}
        </div>
      )}
    </CyberButton>
  );
}
