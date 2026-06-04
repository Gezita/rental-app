import Link from "next/link";
import { Zap } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
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

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Manage your rental units and billing</CardDescription>
          </CardHeader>
          <CardContent>
            {params.error && (
              <Alert variant="error" className="mb-4">
                Invalid email or password.
              </Alert>
            )}
            <form action={signInAction} className="space-y-4">
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
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              No account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-primary-hover underline underline-offset-2"
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
