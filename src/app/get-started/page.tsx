import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { FlashAlert } from "@/components/flash-alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/get-started" size="lg" variant="full" />
          <p className="text-sm text-muted">Landlord billing and document management</p>
        </div>

        <Card className="shadow-[var(--shadow-md)]">
          <CardHeader>
            <CardTitle>Install on your computer</CardTitle>
            <CardDescription>
              zigglo keeps your rental data on your Mac — not on this website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.error === "cloud-data" && (
              <FlashAlert variant="error" clearParams={["error"]}>
                Sign-in and account data are only available in the local app. Install zigglo
                below to get started.
              </FlashAlert>
            )}

            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              <li>
                Download or clone the app, then double-click <strong>install.command</strong> in
                Finder.
              </li>
              <li>
                Launch <strong>zigglo</strong> from your Desktop, or run{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">npm run dev</code>{" "}
                in the project folder.
              </li>
              <li>
                Open{" "}
                <Link href="http://localhost:3000" className="text-primary hover:underline">
                  http://localhost:3000
                </Link>{" "}
                and sign in with demo@landlord.app / demo1234 after setup.
              </li>
            </ol>

            <p className="text-xs text-muted">
              For PostgreSQL (matches production), use{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">make setup</code> from Terminal
              instead of the double-click installer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
