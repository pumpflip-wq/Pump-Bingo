import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/rounds
export function useRounds() {
  return useQuery({
    queryKey: [api.rounds.list.path],
    queryFn: async () => {
      const res = await fetch(api.rounds.list.path);
      if (!res.ok) throw new Error("Failed to fetch rounds");
      return api.rounds.list.responses[200].parse(await res.json());
    },
    refetchInterval: 2000, // Poll list occasionally
  });
}

// GET /api/rounds/:id
export function useRound(id: number) {
  return useQuery({
    queryKey: [api.rounds.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.rounds.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch round");
      return api.rounds.get.responses[200].parse(await res.json());
    },
    refetchInterval: 1000, // Poll active game state frequently
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
      // Also invalidate user balance if we had a full user hook that tracked it
      // For MVP auth hook handles basic user data
    },
  });
}

// GET /api/rounds/:roundId/participants/:userId
export function useParticipant(roundId: number, userId: number | undefined) {
  return useQuery({
    queryKey: [api.participants.get.path, roundId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const url = buildUrl(api.participants.get.path, { roundId, userId });
      const res = await fetch(url);
      if (res.status === 404) return null; // Not joined yet
      if (!res.ok) throw new Error("Failed to fetch participant");
      return api.participants.get.responses[200].parse(await res.json());
    },
    enabled: !!userId,
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
    },
  });
}
