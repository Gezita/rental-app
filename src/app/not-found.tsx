import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-muted">
        <FileQuestion className="h-7 w-7 text-primary" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-sm text-muted">
        That page doesn&apos;t exist or may have been moved. Check the URL or return to your
        dashboard.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        <Link
          href="/properties"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
        >
          View properties
        </Link>
      </div>
    </div>
  );
}
