import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Round } from "@shared/schema";

// ─── Shared Types ────────────────────────────────────────────────────────────

export type RoundParticipant = {
  id: number;
  userId: number;
  username: string;
  joinedAt: string;
  card: number[][];
  txSignature?: string | null;
  winRate?: number;
  finalWinProb?: number;
  prob?: number;
  hasBingo?: boolean;
};

export type RoundData = {
  round: Round & {
    winnerUserId: number | null;
    winnerUsername: string | null;
    mode: string;
  };
  participantsCount: number;
  secondsRemaining: number;
  nextRoundSecondsRemaining: number;
  isWaitingForPlayers: boolean;
  participants: RoundParticipant[];
  status: string;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

// GET /api/rounds (optionally filtered by mode: 'FREE' | 'PAID')
export function useRounds(mode?: string, options?: { refetchInterval?: number; staleTime?: number }) {
  return useQuery({
    queryKey: [api.rounds.list.path, mode],
    queryFn: async () => {
      const url = mode
        ? `${api.rounds.list.path}?mode=${mode}`
        : api.rounds.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch rounds");
      const data = await res.json();
      return Array.isArray(data) ? api.rounds.list.responses[200].parse(data) : [];
    },
    refetchInterval: 1000,
    ...options
  });
}

// GET /api/rounds/:id
export function useRound(id: number, options?: any) {
  const queryClient = useQueryClient();
  
  return useQuery<RoundData | null>({
    queryKey: [api.rounds.get.path, id],
    queryFn: async (): Promise<RoundData | null> => {
      if (!id) return null;
      const url = buildUrl(api.rounds.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch round");
      return res.json() as Promise<RoundData>;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as RoundData | null;
      if (!data) return 1000;
      if (data.round.status === 'OPEN') return 1000;
      if (data.round.status === 'STARTING') return 500;
      if (data.round.status === 'IN_GAME') return 1000;
      if (data.round.status === 'FINISHED') return 2000;
      return 1000;
    },
    staleTime: 0, 
    gcTime: 0,
    refetchOnWindowFocus: true,
    ...options
  });
}

// POST /api/rounds/:id/join
export function useJoinRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundId, userId, txSignature }: { roundId: number; userId: number; txSignature?: string }) => {
      const url = buildUrl(api.rounds.join.path, { id: roundId });
      const res = await fetch(url, {
        method: api.rounds.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, txSignature }),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
            const error = await res.json();
            throw new Error(error.message || "Failed to join");
        }
        throw new Error("Failed to join round");
      }
      return api.rounds.join.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.rounds.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, variables.roundId] });
    },
  });
}

// GET /api/rounds/:roundId/participants/:userId
export function useParticipant(roundId: number, userId: number | undefined) {
  return useQuery({
    queryKey: [api.participants.get.path, roundId, userId],
    queryFn: async () => {
      if (!userId || !roundId) return null;
      const url = buildUrl(api.participants.get.path, { roundId, userId });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch participant");
      return api.participants.get.responses[200].parse(await res.json());
    },
    enabled: !!userId && !!roundId,
  });
}

// POST /api/rounds/:id/claim
export function useClaimBingo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundId, userId }: { roundId: number; userId: number }) => {
      const url = buildUrl(api.rounds.claim.path, { id: roundId });
      const res = await fetch(url, {
        method: api.rounds.claim.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Claim failed");
      }
      return api.rounds.claim.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, variables.roundId] });
      queryClient.invalidateQueries({ queryKey: [api.rounds.list.path] });
    },
  });
}
