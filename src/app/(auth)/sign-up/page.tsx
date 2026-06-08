import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions/auth";
import { getSessionUserId } from "@/lib/auth";
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

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const userId = await getSessionUserId();
  if (userId) redirect("/dashboard");

  const errorMessage =
    params.error === "exists"
      ? "An account with this email already exists."
      : params.error
        ? "Please fill in all required fields. Password must be at least 6 characters."
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo href="/sign-up" size="lg" variant="full" />
          <p className="text-sm text-muted">Start managing your rental portfolio</p>
        </div>
        <Card className="shadow-[var(--shadow-md)]">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Free to use for your rental properties</CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <FlashAlert variant="error" className="mb-4" clearParams={["error"]}>
                {errorMessage}
              </FlashAlert>
            )}
            <form action={signUpAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <SubmitButton className="w-full" pendingLabel="Creating account…">
                Create account
              </SubmitButton>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-primary hover:text-primary-hover underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
