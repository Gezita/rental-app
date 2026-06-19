import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { acceptInviteAction } from "@/app/actions/members";
import { ROLE_LABELS } from "@/lib/property-members";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import {
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/" size="lg" variant="full" />
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.propertyInvite.findUnique({
    where: { token },
    include: { property: { select: { name: true } } },
  });

  const invalid = (title: string, message: string) => (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink href="/sign-in" variant="outline" className="w-full">
            Go to sign in
          </ButtonLink>
        </CardContent>
      </Card>
    </Shell>
  );

  if (!invite) {
    return invalid("Invitation not found", "This invite link is invalid or has been removed.");
  }
  if (invite.status === "REVOKED") {
    return invalid("Invitation revoked", "This invitation is no longer valid. Ask the property owner to send a new one.");
  }
  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    return invalid("Invitation expired", "This invitation has expired. Ask the property owner to send a new one.");
  }

  const userId = await getSessionUserId();

  // Signed in → confirm the account matches, then accept via a form submit
  // (the mutation must happen in an action, not during render).
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user) {
      if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
        return invalid(
          "Wrong account",
          `This invitation was sent to ${invite.email}. Sign in with that account to accept it.`
        );
      }
      return (
        <Shell>
          <Card>
            <CardHeader>
              <CardTitle>Accept invitation</CardTitle>
              <CardDescription>
                Join <strong>{invite.property.name}</strong> as a {ROLE_LABELS[invite.role]}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={acceptInviteAction}>
                <input type="hidden" name="token" value={token} />
                <SubmitButton className="w-full" pendingLabel="Joining…">
                  Accept &amp; join
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </Shell>
      );
    }
  }

  // Not signed in → route to sign-in or sign-up depending on whether an account exists.
  const existing = await prisma.user.findUnique({
    where: { email: invite.email.toLowerCase() },
    select: { id: true },
  });
  const next = `/invite/${token}`;
  const ctaHref = existing
    ? `/sign-in?next=${encodeURIComponent(next)}`
    : `/sign-up?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(next)}`;

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle>You&apos;ve been invited</CardTitle>
          <CardDescription>
            You&apos;ve been invited to manage <strong>{invite.property.name}</strong> as a{" "}
            {ROLE_LABELS[invite.role]} on Lessora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ButtonLink href={ctaHref} className="w-full">
            {existing ? "Sign in to accept" : "Create your account to accept"}
          </ButtonLink>
          <p className="text-center text-xs text-muted">
            Invitation sent to {invite.email}. You won&apos;t be charged for properties
            you&apos;re invited to.
          </p>
          {!existing && (
            <p className="text-center text-sm text-muted">
              Already have an account?{" "}
              <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
