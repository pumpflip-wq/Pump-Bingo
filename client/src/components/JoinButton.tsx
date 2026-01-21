import { useJoinRound } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JoinButtonProps {
  roundId: number;
  price: number;
  userId: number;
}

export function JoinButton({ roundId, price, userId }: JoinButtonProps) {
  const { mutate: joinRound, isPending } = useJoinRound();
  const { toast } = useToast();

  const handleJoin = () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    joinRound(
      { roundId, userId },
      {
        onSuccess: () => {
          toast({
            title: "TRANSACTION CONFIRMED",
            description: `NODE @${userId} ENGAGED: +100 PUMP DEPOSITED TO SEQUENCE #${roundId}`,
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
