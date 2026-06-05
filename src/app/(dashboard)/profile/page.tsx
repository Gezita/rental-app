import { updateProfileAction } from "@/app/actions/app";
import { requireUser } from "@/lib/auth";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { FlashAlert } from "@/components/flash-alert";
import { SubmitButton } from "@/components/submit-button";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import Link from "next/link";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { saved } = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav />
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted">Your account information</p>
      </div>

      {saved && <FlashAlert clearParams={["saved"]}>Profile updated.</FlashAlert>}

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Member since {user.createdAt.toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" name="name" defaultValue={user.name || ""} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={user.email} disabled />
              <p className="text-xs text-muted">Email cannot be changed in the MVP.</p>
            </div>
            <SubmitButton pendingLabel="Saving…">Save Profile</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing & Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Update payment instructions and statement templates in settings.
          </p>
          <Link href="/settings">
            <Button variant="outline">Go to Settings</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
