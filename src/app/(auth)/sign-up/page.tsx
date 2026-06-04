import Link from "next/link";
import { Zap } from "lucide-react";
import { signUpAction } from "@/app/actions/auth";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
} from "@/components/ui";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage =
    params.error === "exists"
      ? "An account with this email already exists."
      : params.error
        ? "Please fill in all required fields. Password must be at least 6 characters."
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted">
            <Zap className="h-6 w-6 text-primary" />
          </span>
          <p className="text-sm font-medium text-muted">Rentals Dashboard</p>
        </div>
        <Card className="shadow-[var(--shadow-md)]">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start managing your rental portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="error" className="mb-4">
              {errorMessage}
            </Alert>
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
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-primary-hover underline underline-offset-2"
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
