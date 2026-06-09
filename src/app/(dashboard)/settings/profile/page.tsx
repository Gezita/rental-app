import { updateProfileAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { FlashAlert } from "@/components/flash-alert";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader title="Profile" description="Your account information" />

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
