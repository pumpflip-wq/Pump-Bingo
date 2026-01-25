import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRounds, useRound, useParticipant } from './use-game';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { type User, type Round, type Transaction } from '@shared/schema';
import { api } from "@shared/routes";

export function useGameState() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const [userId, setUserId] = useState<number | null>(null);
  
  const { data: user } = useQuery<User>({ 
    queryKey: ["/api/auth/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/auth/me/${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId
  });

  const { mutate: login } = useMutation({
    mutationFn: (address: string) => apiRequest("POST", "/api/auth/login", { username: address }).then(res => res.json()),
    onSuccess: (data) => {
      setUserId(data.id);
      queryClient.setQueryData(["/api/auth/me", data.id], data);
    }
  });

  useEffect(() => {
    if (connected && walletAddress && !user) {
      login(walletAddress);
    }
  }, [connected, walletAddress, login, user]);

  const { data: rounds, isLoading: roundsLoading, error: roundsError } = useRounds();
  const latestRound = rounds && rounds.length > 0 ? rounds[0] : null;
  const { data: roundData, isLoading: roundLoading, error: roundError, refetch: refetchRound } = useRound(latestRound?.id as number);

  // Poll round data more frequently with invalidation to ensure UI reflects server changes
  useEffect(() => {
    if (latestRound?.id) {
      const interval = setInterval(() => {
        // Refetch both the specific round and the list to ensure full synchronization
        queryClient.invalidateQueries({ queryKey: [api.rounds.get.path, latestRound.id] });
        queryClient.invalidateQueries({ queryKey: [api.rounds.list.path] });
      }, 1000); 
      return () => clearInterval(interval);
    }
  }, [latestRound?.id]);

  const { data: participant } = useParticipant(latestRound?.id as number, user?.id);

  const { data: historyRounds, isLoading: historyLoading } = useQuery<{ rounds: (Round & { winnerUsername: string | null })[], total: number }>({
    queryKey: ["/api/rounds/history", 1],
    queryFn: () => fetch("/api/rounds/history?page=1&limit=5").then(res => res.json()),
    refetchInterval: 2000 
  });

  const { data: userTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/auth/me/transactions", user?.id],
    enabled: !!user?.id,
    refetchInterval: 2000 
  });

  const foundParticipant = roundData?.participants?.find((p: any) => p.username === walletAddress);
  
  return {
    user,
    walletAddress,
    connected,
    roundData,
    latestRound,
    participant,
    foundParticipant,
    isLoading: roundsLoading || (!!latestRound && roundLoading),
    error: roundsError || roundError,
    historyRounds,
    historyLoading,
    userTransactions
  };
}
