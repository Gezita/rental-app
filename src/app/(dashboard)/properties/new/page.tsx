import { createPropertyAction } from "@/app/actions";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageBackNav parent={{ href: "/properties", label: "Properties" }} />
      <div>
        <h1 className="text-2xl font-bold">Add property</h1>
        <p className="text-muted">Create a new rental property</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPropertyAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" name="name" placeholder="Duplex on Main St" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input id="addressLine1" name="addressLine1" placeholder="123 Main Street" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input id="province" name="province" placeholder="ON" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" placeholder="M5V 1A1" />
            </div>
            <Button type="submit">Create Property</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
