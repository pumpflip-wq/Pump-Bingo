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
    enabled: !!userId,
    staleTime: 0 // Always fetch fresh user data on mount
  });

  const { mutate: login } = useMutation({
    mutationFn: (address: string) => apiRequest("POST", "/api/auth/login", { username: address }).then(res => res.json()),
    onSuccess: (data) => {
      setUserId(data.id);
      localStorage.setItem("pb_user_id", data.id.toString());
      queryClient.setQueryData(["/api/auth/me", data.id], data);
    }
  });

  useEffect(() => {
    const stored = localStorage.getItem("pb_user_id");
    if (stored) setUserId(Number(stored));

    const handleStorageChange = () => {
      const updated = localStorage.getItem("pb_user_id");
      if (updated) setUserId(Number(updated));
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen for local changes in the same tab
    const interval = setInterval(() => {
      const current = localStorage.getItem("pb_user_id");
      if (current && Number(current) !== userId) {
        setUserId(Number(current));
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    if (connected && walletAddress && (!user || user.username !== walletAddress)) {
      console.log("[useGameState] Triggering login for:", walletAddress);
      login(walletAddress);
    }
  }, [connected, walletAddress, user?.username, login]);

  const { data: rounds, isLoading: roundsLoading, error: roundsError } = useRounds();
  const latestRound = rounds && rounds.length > 0 ? rounds[0] : null;
  const { data: roundData, isLoading: roundLoading, error: roundError, refetch: refetchRound } = useRound(latestRound?.id as number);

  // Poll round data based on server-driven status and timers
  useEffect(() => {
    if (latestRound?.id) {
      const interval = setInterval(() => {
        // Force invalidate with refetch to ensure no stale data remains in cache
        queryClient.invalidateQueries({ 
          queryKey: [api.rounds.get.path, latestRound.id], 
          exact: true
        });
        queryClient.invalidateQueries({ 
          queryKey: [api.rounds.list.path]
        });
      }, 2000); 
      return () => clearInterval(interval);
    }
  }, [latestRound?.id, queryClient]);

  const { data: userTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/auth/me/transactions", user?.id],
    enabled: !!user?.id,
    refetchInterval: 5000 
  });

  const { data: historyRounds, isLoading: historyLoading } = useQuery<{ rounds: (Round & { winnerUsername: string | null })[], total: number }>({
    queryKey: ["/api/rounds/history", 1],
    queryFn: () => fetch("/api/rounds/history?page=1&limit=10").then(res => res.json()),
    refetchInterval: 10000 
  });

  const participant = roundData?.participants?.find((p: any) => p.userId === userId);
  const foundParticipant = participant; 
  
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
    userTransactions,
    refetch: () => {
      refetchRound();
    }
  };
}
