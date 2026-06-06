import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
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

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/sign-in" size="lg" variant="full" />
          <p className="text-sm text-muted">Landlord billing and document management</p>
        </div>
        <Card className="shadow-[var(--shadow-md)]">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Manage your rental units and billing</CardDescription>
          </CardHeader>
          <CardContent>
            {params.error && (
              <FlashAlert variant="error" className="mb-4" clearParams={["error"]}>
                Invalid email or password.
              </FlashAlert>
            )}
            <form action={signInAction} className="space-y-4">
              {params.next && <input type="hidden" name="next" value={params.next} />}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue="demo@landlord.app"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  defaultValue="demo1234"
                />
              </div>
              <SubmitButton className="w-full" pendingLabel="Signing in…">
                Sign in
              </SubmitButton>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              No account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-primary hover:text-primary-hover underline-offset-2 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
