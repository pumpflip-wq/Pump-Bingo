import { useJoinRound } from "@/hooks/use-game";
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
}

export function JoinButton({ roundId, price, userId }: JoinButtonProps) {
  const { mutate: joinRound, isPending } = useJoinRound();
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const handleJoin = async () => {
    if (!publicKey || !userId) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Create Solana Transaction (Buy-in)
      const treasury = new PublicKey("DajB37qp74UzwND3N1rVWtLdxr55nhvuK2D4x476zmns");
      // Calculate lamports (1 SOL = 10^9 lamports). For MVP using SOL instead of SPL for simplicity
      const lamports = price * 1000000; // Mocking price to lamports conversion

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasury,
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // 2. Join Round with Tx Signature
      joinRound(
        { roundId, userId, txSignature: signature },
        {
          onSuccess: () => {
            toast({
              title: "Successfully Joined",
              description: "Transaction confirmed and you've entered the round!",
            });
            // Play sound
            new Audio("/sounds/join.mp3").play().catch(() => {});
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
