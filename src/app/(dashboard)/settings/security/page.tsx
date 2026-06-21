import { changePasswordAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { FlashAlert } from "@/components/flash-alert";
import { PageHeader } from "@/components/dashboard/page-header";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
} from "@/components/ui";

function passwordErrorMessage(error: string) {
  switch (error) {
    case "invalid":
      return "Use at least 12 characters with uppercase, lowercase, and a number. Both new password fields must match.";
    case "current":
      return "Current password was not correct.";
    case "reused":
      return "Choose a new password you have not used for this account.";
    case "locked":
      return "Too many failed password attempts. Try again in 15 minutes.";
    case "google_only":
      return "This account signs in with Google and does not have a local password to change.";
    default:
      return "Could not update your password. Check the fields and try again.";
  }
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const hasLocalPassword = Boolean(user.password);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Security"
        description="Change your password and review account safeguards"
      />

      {params.saved === "password" && (
        <FlashAlert clearParams={["saved"]}>Password updated.</FlashAlert>
      )}
      {params.error && (
        <FlashAlert variant="error" clearParams={["error"]}>
          {passwordErrorMessage(params.error)}
        </FlashAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password before choosing a new one. Updating it signs this browser
            into a fresh session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasLocalPassword ? (
            <form action={changePasswordAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
                <p className="text-xs text-muted">
                  Use at least 12 characters with uppercase, lowercase, and a number.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
              <SubmitButton pendingLabel="Updating…">Update Password</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">
              This account uses Google sign-in. There is no local password to change.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Safety Procedures</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted">
            <li>Current password is required before any password change.</li>
            <li>Five failed current-password checks lock changes for 15 minutes.</li>
            <li>New passwords must be stronger and cannot match the current password.</li>
            <li>Session credentials are refreshed immediately after a successful change.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
