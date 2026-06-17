"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[auth] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-danger-muted text-danger">
            <AlertCircle className="h-5 w-5" />
          </div>
          <CardTitle>Could not load sign-in</CardTitle>
          <CardDescription>
            This is usually a temporary connection issue. Wait a moment and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Back to sign in
          </Link>
          {error.digest && (
            <p className="text-xs text-muted">Reference: {error.digest}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
