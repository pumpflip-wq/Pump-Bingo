import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Round, type Participant, type User, ROUND_STATUS } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, ShieldCheck, Settings, Users, Play, AlertTriangle, Wallet, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatCurrency } from "@/lib/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { PROTOCOL_CONFIG } from "@shared/config";

interface AdminStats {
  totalDistributed: number;
  totalRevenue: number;
  userCount: number;
  masterWalletBalance: number;
  masterWalletSymbol: string;
  isTestMode: boolean;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { publicKey } = useWallet();

  const walletAddress = publicKey?.toString();
  const isAdmin = walletAddress === PROTOCOL_CONFIG.ADMIN_WALLET || user?.username === PROTOCOL_CONFIG.ADMIN_WALLET;

  const forceStartMutation = useMutation({
    mutationFn: async (roundId: number) => {
      await apiRequest("POST", `/api/rounds/${roundId}/force-start`, { adminWallet: PROTOCOL_CONFIG.ADMIN_WALLET });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      toast({
        title: "Success",
        description: "Round force started",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({ 
    queryKey: ["/api/rounds"],
    refetchInterval: 2000
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 5000
  });

  const activeRoundsCount = rounds?.filter(r => r.status !== ROUND_STATUS.FINISHED).length || 0;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-2">ACCESS RESTRICTED</h1>
        <p className="text-muted-foreground max-w-md">
          This terminal is restricted to authorized administrator protocols only.
          Your current signature does not match the required clearance level.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
          PROTOCOL <span className="text-primary">CONTROL</span>
        </h1>
        <div className="flex items-center gap-4">
          <Button 
            variant="destructive" 
            size="sm"
            className="font-black italic uppercase h-9 px-4 text-[10px] gap-2"
            onClick={async () => {
              if (confirm("Are you sure? This will reset the entire system!")) {
                try {
                  await apiRequest("POST", "/api/admin/reset", { adminWallet: PROTOCOL_CONFIG.ADMIN_WALLET });
                  toast({ title: "System Reset Successful" });
                  queryClient.invalidateQueries();
                } catch (err: any) {
                  toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
                }
              }
            }}
          >
            <AlertTriangle className="w-3 h-3" /> EMERGENCY RESET
          </Button>
          <div className="flex gap-4">
            <div className="bg-card p-4 rounded-xl border border-white/10 flex items-center gap-3">
              <Activity className="text-primary w-5 h-5" />
              <div>
                <p className="text-[10px] uppercase font-black text-white/40">Active Rounds</p>
                <p className="text-xl font-black text-white italic">{activeRoundsCount}</p>
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-white/10 flex items-center gap-3">
              <Users className="text-primary w-5 h-5" />
              <div>
                <p className="text-[10px] uppercase font-black text-white/40">Total Users</p>
                <p className="text-xl font-black text-white italic">{stats?.userCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/80 border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2">
            <div className={cn(
              "px-2 py-0.5 rounded text-[8px] font-black uppercase",
              stats?.isTestMode ? "bg-yellow-500/20 text-yellow-500" : "bg-primary/20 text-primary"
            )}>
              {stats?.isTestMode ? "Test Mode" : "Live Mode"}
            </div>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
              <Wallet className="w-3 h-3" /> Master Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-white italic">
              {formatCurrency(stats?.masterWalletBalance || 0, false)} <span className="text-sm">{PROTOCOL_CONFIG.SYMBOL}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-primary" /> Total Distributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-primary italic">
              {formatCurrency(stats?.totalDistributed || 0, false)} <span className="text-sm text-white/60">{PROTOCOL_CONFIG.SYMBOL}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-primary" /> System Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-white italic">
              {formatCurrency(stats?.totalRevenue || 0, false)} <span className="text-sm text-white/60">{PROTOCOL_CONFIG.SYMBOL}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/80 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl font-black text-white italic uppercase">Recent Rounds</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-white/40 font-black uppercase text-[10px]">ID</TableHead>
                <TableHead className="text-white/40 font-black uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white/40 font-black uppercase text-[10px]">Prize Pool</TableHead>
                <TableHead className="text-white/40 font-black uppercase text-[10px]">Actions</TableHead>
                <TableHead className="text-white/40 font-black uppercase text-[10px]">Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds?.map((round) => (
                <TableRow key={round.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono text-primary">#{round.id}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase">
                      {round.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-black text-white italic">{formatCurrency(round.prizePool || 0, false)} {PROTOCOL_CONFIG.SYMBOL}</TableCell>
                  <TableCell>
                    {round.status === ROUND_STATUS.OPEN && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2 font-black italic uppercase text-[10px]"
                        onClick={() => forceStartMutation.mutate(round.id)}
                        disabled={forceStartMutation.isPending}
                      >
                        <Play className="w-3 h-3 fill-current" /> Force Start
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-white/40 text-xs">
                    {new Date(round.createdAt!).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
