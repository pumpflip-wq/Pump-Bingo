import { useClaimBingo } from "@/hooks/use-game";
import { CyberButton } from "@/components/ui/CyberButton";
import { Loader2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUND_STATUS } from "@shared/schema";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

interface BingoClaimButtonProps {
  roundId: number;
  userId: number;
  card: number[][];
  drawnNumbers: number[];
  status: string;
  isBingoed: boolean;
  className?: string;
}

function checkBingo(card: number[][], drawnNumbers: number[]): boolean {
  if (!drawnNumbers || drawnNumbers.length < 4) return false;
  const drawn = new Set(drawnNumbers);
  
  // A standard Bingo win requires 5 marks in a row/column/diagonal.
  // The center space (card[2][2]) is often a free space (value 0).
  const isMarked = (n: number) => n === 0 || drawn.has(n);

  // Rows
  for (let row = 0; row < 5; row++) {
    let rowComplete = true;
    for (let col = 0; col < 5; col++) {
      if (!isMarked(card[row][col])) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) return true;
  }

  // Columns
  for (let col = 0; col < 5; col++) {
    let colComplete = true;
    for (let row = 0; row < 5; row++) {
      if (!isMarked(card[row][col])) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) return true;
  }

  // Diagonal 1 (top-left to bottom-right)
  let diag1Complete = true;
  for (let i = 0; i < 5; i++) {
    if (!isMarked(card[i][i])) {
      diag1Complete = false;
      break;
    }
  }
  if (diag1Complete) return true;

  // Diagonal 2 (top-right to bottom-left)
  let diag2Complete = true;
  for (let i = 0; i < 5; i++) {
    if (!isMarked(card[i][4 - i])) {
      diag2Complete = false;
      break;
    }
  }
  if (diag2Complete) return true;

  return false;
}

export function BingoClaimButton({ 
  roundId, 
  userId, 
  card, 
  drawnNumbers, 
  status, 
  isBingoed,
  className
}: BingoClaimButtonProps) {
  const { mutate: claimBingo, isPending } = useClaimBingo();
  const { toast } = useToast();

  const hasBingo = checkBingo(card, drawnNumbers);
  const canClaim = status === ROUND_STATUS.IN_GAME && hasBingo && !isBingoed;

  const handleClaim = () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    // Optimistic UI: Hide button immediately upon click
    claimBingo(
      { roundId, userId },
      {
        onSuccess: () => {
          // Force immediate invalidation of round data to lock the room
          queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
          queryClient.invalidateQueries({ queryKey: ["/api/rounds", roundId] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        },
        onError: (error: Error) => {
          toast({
            title: "Claim Failed",
            description: error.message || "Could not claim bingo.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (status === ROUND_STATUS.FINISHED || isBingoed) {
    return null;
  }

  return (
    <CyberButton
      onClick={handleClaim}
      disabled={!canClaim || isPending}
      className={cn("px-10 h-14 text-3xl font-black italic tracking-tighter", canClaim ? 'animate-pulse' : 'opacity-50', className)}
      data-testid="button-claim-bingo"
    >
      {isPending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          CLAIMING...
        </>
      ) : hasBingo ? (
        <>
          <Trophy className="w-5 h-5 mr-2" />
          CLAIM BINGO!
        </>
      ) : (
        "NO BINGO YET"
      )}
    </CyberButton>
  );
}
