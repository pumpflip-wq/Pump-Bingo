import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { CyberButton } from "@/components/ui/CyberButton";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md mx-4 bg-card border-white/10">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold font-display text-white">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground mb-6">
            The page you are looking for does not exist on this chain.
          </p>

          <Link href="/">
            <CyberButton variant="primary" className="w-full">
              Return Home
            </CyberButton>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
