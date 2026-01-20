import { useQuery } from "@tanstack/react-query";
import { type Round, type Participant, type User } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, ShieldCheck, Settings, Users } from "lucide-react";

export default function AdminDashboard() {
  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({ queryKey: ["/api/rounds"] });
  
  if (roundsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
          PROTOCOL <span className="text-primary">CONTROL</span>
        </h1>
        <div className="flex gap-4">
          <div className="bg-card p-4 rounded-xl border border-white/10 flex items-center gap-3">
            <Users className="text-primary w-5 h-5" />
            <div>
              <p className="text-[10px] uppercase font-black text-white/40">Total Nodes</p>
              <p className="text-xl font-black text-white italic">2,481</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
