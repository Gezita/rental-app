import Link from "next/link";
import { redirect } from "next/navigation";
import { requestTenantMagicLinkAction } from "@/app/actions/tenant-auth";
import { getSessionTenantId } from "@/lib/tenant-auth";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import { FlashAlert } from "@/components/flash-alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";

export default async function TenantSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const tenantId = await getSessionTenantId();
  if (tenantId) redirect("/tenant");

  const message =
    params.sent === "1"
      ? "If your email is on file with your landlord, you will receive a sign-in link shortly."
      : params.error === "expired"
        ? "That sign-in link has expired. Request a new one below."
        : params.error === "locked"
          ? "Too many attempts. Please wait 15 minutes and try again."
          : params.error === "send"
            ? "We could not send the email. Try again in a moment."
            : params.error
              ? "Enter the email address your landlord has on file."
              : null;

  const messageVariant =
    params.sent === "1" ? ("info" as const) : params.error ? ("error" as const) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/tenant/sign-in" size="lg" variant="full" />
          <p className="text-sm text-muted">Tenant portal — statements, documents, and notices</p>
        </div>
        <Card className="shadow-[var(--shadow-md)]">
          <CardHeader>
            <CardTitle>Tenant sign in</CardTitle>
            <CardDescription>
              We will email you a secure link. No password needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && messageVariant && (
              <FlashAlert variant={messageVariant} className="mb-4" clearParams={["sent", "error"]}>
                {message}
              </FlashAlert>
            )}
            <form action={requestTenantMagicLinkAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <SubmitButton className="w-full" pendingLabel="Sending link…">
                Email me a sign-in link
              </SubmitButton>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              Landlord?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-primary hover:text-primary-hover underline-offset-2 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
