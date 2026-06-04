import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import {
  createTenantAction,
  deleteUnitAction,
  moveOutTenantAction,
  updateTenantAction,
  updateUnitAction,
  uploadLeaseAction,
} from "@/app/actions/app";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string; unitId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { propertyId, unitId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, propertyId, property: { userId: user.id } },
    include: {
      property: true,
      tenants: { where: { isActive: true } },
      utilityRules: true,
      statements: { orderBy: [{ statementYear: "desc" }, { statementMonth: "desc" }], take: 3 },
      leases: {
        where: { status: "active" },
        include: { document: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!unit) notFound();

  const pastTenants = await prisma.tenant.findMany({
    where: { unitId, isActive: false },
    orderBy: { moveOutDate: "desc" },
    take: 5,
  });

  const tenant = unit.tenants[0];
  const activeLease = unit.leases[0];
  const addTenant = createTenantAction.bind(null, unitId);
  const updateUnit = updateUnitAction.bind(null, unitId);
  const updateTenant = tenant ? updateTenantAction.bind(null, tenant.id) : null;
  const moveOutTenant = tenant ? moveOutTenantAction.bind(null, tenant.id) : null;
  const uploadLease = uploadLeaseAction.bind(null, unitId);
  const deleteUnit = deleteUnitAction.bind(null, unitId);

  const savedMessage =
    query.saved === "unit"
      ? "Unit details updated."
      : query.saved === "tenant"
        ? "Tenant information updated."
        : query.saved === "lease"
          ? "Lease document uploaded."
          : query.saved === "moved"
            ? "Tenant marked as moved out. You can onboard a new tenant below."
            : query.saved === "newtenant"
              ? "New tenant added and previous tenant marked as moved out."
              : null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: `/properties/${propertyId}`, label: unit.property.name }} />
      <div>
        <h1 className="text-2xl font-bold">{unit.name}</h1>
      </div>

      {savedMessage && <Alert>{savedMessage}</Alert>}
      {query.error === "lease" && (
        <Alert variant="error">Please select a lease file to upload.</Alert>
      )}
      {query.error === "delete_confirm" && (
        <Alert variant="error">
          Delete cancelled — type the unit name exactly to confirm.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(unit.rentAmountCents)}</p>
            <p className="text-sm text-slate-500">Due on day {unit.rentDueDay}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant ? (
              <>
                <p className="font-medium">
                  {tenant.firstName} {tenant.lastName}
                </p>
                <p className="text-sm text-slate-500">{tenant.email || "No email"}</p>
              </>
            ) : (
              <Badge variant="warning">No active tenant</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lease</CardTitle>
          </CardHeader>
          <CardContent>
            {activeLease?.document ? (
              <>
                <Link href={`/api/documents/${activeLease.document.id}`} target="_blank">
                  <Button variant="outline" size="sm">
                    View Lease
                  </Button>
                </Link>
                {activeLease.leaseEndDate && (
                  <p className="mt-2 text-sm text-slate-500">
                    Ends {activeLease.leaseEndDate.toLocaleDateString("en-CA")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">No lease uploaded</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/properties/${propertyId}/units/${unitId}/utilities`}>
          <Button variant="outline">Utility Rules</Button>
        </Link>
        <Link href={`/properties/${propertyId}/units/${unitId}/statements`}>
          <Button variant="outline">Statements</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Unit</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUnit} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Unit Name</Label>
              <Input id="name" name="name" defaultValue={unit.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Monthly Rent ($)</Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(unit.rentAmountCents / 100).toFixed(2)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentDueDay">Rent Due Day</Label>
              <Input
                id="rentDueDay"
                name="rentDueDay"
                type="number"
                min="1"
                max="31"
                defaultValue={unit.rentDueDay}
                required
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Save Unit</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tenant && updateTenant && moveOutTenant && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Edit current tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateTenant} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={tenant.firstName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={tenant.lastName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={tenant.email || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={tenant.phone || ""} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Save Tenant</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Tenant moving out</CardTitle>
              <CardDescription>
                Mark the current tenant as moved out. Their history and statements stay on
                record. Add a new tenant afterward.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={moveOutTenant} className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moveOutDate">Move-out date</Label>
                  <Input
                    id="moveOutDate"
                    name="moveOutDate"
                    type="date"
                    defaultValue={today}
                    required
                  />
                </div>
                <Button type="submit" variant="outline">
                  Mark as moved out
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onboard new tenant</CardTitle>
              <CardDescription>
                Adds a new tenant and automatically marks {tenant.firstName} as moved out on
                the move-in date. Use this when turnover happens in one step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addTenant} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new_firstName">First Name</Label>
                  <Input id="new_firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_lastName">Last Name</Label>
                  <Input id="new_lastName" name="lastName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_email">Email</Label>
                  <Input id="new_email" name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_phone">Phone</Label>
                  <Input id="new_phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moveInDate">Move-in date</Label>
                  <Input
                    id="moveInDate"
                    name="moveInDate"
                    type="date"
                    defaultValue={today}
                    required
                  />
                </div>
                <div className="flex items-end md:col-span-2">
                  <Button type="submit">Add new tenant</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {!tenant && (
        <Card>
          <CardHeader>
            <CardTitle>Onboard new tenant</CardTitle>
            <CardDescription>No active tenant — add someone moving in.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addTenant} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moveInDate">Move-in date</Label>
                <Input
                  id="moveInDate"
                  name="moveInDate"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Add tenant</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {pastTenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {pastTenants.map((t) => (
                <li key={t.id}>
                  {t.firstName} {t.lastName}
                  {t.moveOutDate
                    ? ` — moved out ${t.moveOutDate.toLocaleDateString("en-CA")}`
                    : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Lease</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadLease} className="flex flex-wrap items-end gap-4" encType="multipart/form-data">
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="file">Lease PDF or Image</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseEndDate">Lease end date (for reminders)</Label>
              <Input id="leaseEndDate" name="leaseEndDate" type="date" />
            </div>
            <Button type="submit">Upload Lease</Button>
          </form>
          {!tenant && (
            <p className="mt-2 text-xs text-slate-500">Add a tenant first to attach the lease record.</p>
          )}
        </CardContent>
      </Card>

      {unit.statements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Period</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {unit.statements.map((s) => (
                  <Tr key={s.id}>
                    <Td>{s.statementNumber}</Td>
                    <Td>
                      {s.statementMonth}/{s.statementYear}
                    </Td>
                    <Td>{formatMoney(s.totalDueCents)}</Td>
                    <Td>
                      <Badge variant={s.status === "paid" ? "success" : "secondary"}>{s.status}</Badge>
                    </Td>
                    <Td>
                      <Link href={`/statements/${s.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Delete unit</CardTitle>
          <CardDescription>
            Permanently removes this unit, tenants, statements, and utility rules. This cannot
            be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDeleteForm
            action={deleteUnit}
            entityName={unit.name}
            buttonLabel="Delete unit"
            description="All data for this unit will be removed from your account."
          />
        </CardContent>
      </Card>
    </div>
  );
}
