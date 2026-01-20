import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Round, type Participant, type User, ROUND_STATUS } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, ShieldCheck, Settings, Users, Play, Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import crypto from "crypto";

const ADMIN_WALLET = "DajB37qp74UzwND3N1rVWtLdxr55nhvuK2D4x476zmns";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [verifySeed, setVerifySeed] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<{valid: boolean, hash: string} | null>(null);

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({ 
    queryKey: ["/api/rounds"],
    refetchInterval: 2000
  });

  if (!user || user.username !== ADMIN_WALLET) {
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

  const handleVerify = () => {
    if (!verifySeed) return;
    const computedHash = crypto.createHash('sha256').update(verifySeed).digest('hex');
    setVerificationResult({
      valid: computedHash === verifyHash,
      hash: computedHash
    });
  };

  const forceStartMutation = useMutation({
    mutationFn: async (roundId: number) => {
      await apiRequest("POST", `/api/rounds/${roundId}/force-start`, {});
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
  
  if (roundsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeRoundsCount = rounds?.filter(r => r.status !== ROUND_STATUS.FINISHED).length || 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
          PROTOCOL <span className="text-primary">CONTROL</span>
        </h1>
        <div className="flex gap-4">
          <div className="bg-card p-4 rounded-xl border border-white/10 flex items-center gap-3">
            <Settings className="text-primary w-5 h-5" />
            <div>
              <p className="text-[10px] uppercase font-black text-white/40">Active Rounds</p>
              <p className="text-xl font-black text-white italic">{activeRoundsCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/80 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase text-white/60">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-black italic uppercase">Firewall Active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase text-white/60">Fairness Verifier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Input 
                placeholder="Server Seed" 
                value={verifySeed} 
                onChange={(e) => setVerifySeed(e.target.value)}
                className="bg-black/20 border-white/10"
              />
              <Input 
                placeholder="Public Hash" 
                value={verifyHash} 
                onChange={(e) => setVerifyHash(e.target.value)}
                className="bg-black/20 border-white/10"
              />
              <Button onClick={handleVerify} className="w-full gap-2 font-black italic uppercase">
                <Search className="w-4 h-4" /> Verify Protocol
              </Button>
            </div>
            {verificationResult && (
              <div className={cn(
                "p-4 rounded-xl border flex items-center gap-3",
                verificationResult.valid ? "bg-primary/10 border-primary/20 text-primary" : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                {verificationResult.valid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">
                    {verificationResult.valid ? "Verification Passed" : "Verification Failed"}
                  </p>
                  <p className="text-[10px] font-mono break-all opacity-60">{verificationResult.hash}</p>
                </div>
              </div>
            )}
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
                  <TableCell className="font-black text-white italic">{round.prizePool} PUMP</TableCell>
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
