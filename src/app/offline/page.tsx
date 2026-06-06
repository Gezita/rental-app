import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <BrandLogo href="" size="lg" variant="icon" />
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-muted-foreground">
        Check your connection and try again. Cached pages may still be available.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
