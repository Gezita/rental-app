"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in server/browser logs for diagnosis.
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-danger-muted text-danger">
            <AlertCircle className="h-5 w-5" />
          </div>
          <CardTitle>Something went wrong loading this page</CardTitle>
          <CardDescription>
            This is usually a temporary connection issue. Try again in a moment — your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => reset()}>Try again</Button>
          {error.digest && (
            <p className="text-xs text-muted">Reference: {error.digest}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
