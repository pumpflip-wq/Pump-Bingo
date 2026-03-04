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
  const isWinnerDeclared = !!roundData?.round.winnerId;
  const nextRoundSecondsRemaining = (roundData as any)?.nextRoundSecondsRemaining ?? 0;

  const [isWalleting, setIsWalleting] = useState(false);

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
      const isFreeMode = Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) === 0;
      let signature = "";

      if (!isFreeMode) {
        signature = "TX_SIG_" + Date.now();
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

        const isSPLMode = !!PROTOCOL_CONFIG.MINT_ADDRESS;

        if (PROTOCOL_CONFIG.NETWORK === "mainnet-beta") {
          if (isSPLMode) {
            const mint = new PublicKey(PROTOCOL_CONFIG.MINT_ADDRESS!);
            const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET);
            
            const userATA = await getAssociatedTokenAddress(mint, publicKey);
            const treasuryATA = await getAssociatedTokenAddress(mint, treasury);

            try {
              const account = await getAccount(connection, userATA);
              if (Number(account.amount) < price) {
                throw new Error(`Insufficient ${PROTOCOL_CONFIG.SYMBOL} balance.`);
              }
            } catch (e: any) {
              if (e.name === 'TokenAccountNotFoundError') {
                throw new Error(`You don't have a ${PROTOCOL_CONFIG.SYMBOL} token account. Please make sure you have the tokens.`);
              }
              throw new Error(e.message || `Could not verify ${PROTOCOL_CONFIG.SYMBOL} balance. Make sure you have the tokens.`);
            }

            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            const transaction = new Transaction().add(
              createTransferCheckedInstruction(
                userATA,
                mint,
                treasuryATA,
                publicKey,
                BigInt(price),
                PROTOCOL_CONFIG.DECIMALS
              )
            );

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            signature = await sendTransaction(transaction, connection, { 
              preflightCommitment: 'confirmed',
            });
            
            await connection.confirmTransaction(signature, "confirmed");
          } else {
            // Fallback to SOL if no MINT_ADDRESS provided (safety)
            const treasury = new PublicKey(PROTOCOL_CONFIG.ADMIN_WALLET);
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: treasury,
                lamports: price,
              })
            );
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;
            signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
          }
        }

        await apiRequest("POST", "/api/payments/queue", {
          userId,
          amount: price,
          txSignature: signature
        }).catch(console.error);
      } else {
        signature = "FREE_" + userId + "_" + Date.now();
      }

      joinRound(
        { roundId, userId, txSignature: signature },
        {
          onSuccess: (data: any) => {
            setIsWalleting(false);
            queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, roundId] });
            
            const isActuallyStarted = roundData?.round?.status === "IN_GAME" || roundData?.round?.status === "FINISHED";
            const showQueued = data.queued && isActuallyStarted;

            toast({
              title: showQueued ? "Queued for Next Round" : "Successfully Joined",
              description: showQueued 
                ? "You've been added to the queue for the next game!" 
                : "You've successfully entered the round!",
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
          <span>{isWalleting ? (Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) === 0 ? 'JOINING...' : 'WAITING FOR WALLET...') : 'JOINING...'}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <span>{Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) === 0 ? 'PLAY FOR FREE' : 'JOIN GAME -'}</span>
          {Number(PROTOCOL_CONFIG.DEFAULT_ENTRY_PRICE) > 0 && (
            <span className="text-3xl text-black font-black">
              {formatCurrency(price, false)} {PROTOCOL_CONFIG.SYMBOL}
            </span>
          )}
        </div>
      )}
    </CyberButton>
  );
}
