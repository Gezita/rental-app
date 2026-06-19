import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CircleDollarSign, FileText, FolderOpen, Home, Shield, Wrench } from "lucide-react";
import { deletePropertyAction, updatePropertyFinancesAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { formatMoney } from "@/lib/money";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/lib/document-constants";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { PropertyMembersCard } from "@/components/property/members-card";
import { FlashAlert } from "@/components/flash-alert";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import {
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

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ error?: string; deleted?: string; saved?: string; joined?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, members: { some: { userId: user.id } } },
    include: {
      units: {
        include: {
          tenants: { where: { isActive: true } },
        },
      },
      _count: {
        select: {
          maintenanceRecords: {
            where: { status: { in: ["planned", "in_progress"] } },
          },
        },
      },
    },
  });

  if (!property) notFound();

  const [documentCounts, recentPropertyDocuments] = await Promise.all([
    prisma.document.groupBy({
      by: ["category"],
      where: { userId: user.id, propertyId },
      _count: { _all: true },
    }),
    prisma.document.findMany({
      where: { userId: user.id, propertyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fileName: true, category: true, createdAt: true },
    }),
  ]);

  const [members, pendingInvites] = await Promise.all([
    prisma.propertyMember.findMany({
      where: { propertyId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.propertyInvite.findMany({
      where: { propertyId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, createdAt: true, token: true },
    }),
  ]);
  const currentRole = members.find((m) => m.userId === user.id)?.role ?? "VIEWER";
  const isOwner = currentRole === "OWNER";

  const documentCountByCategory = new Map(
    documentCounts.map((row) => [row.category, row._count._all])
  );
  const totalPropertyDocuments = documentCounts.reduce(
    (sum, row) => sum + row._count._all,
    0
  );

  const monthlyRent = property.units.reduce((s, u) => s + u.rentAmountCents, 0);
  const occupiedUnits = property.units.filter((u) => u.tenants.length > 0).length;
  const vacantUnits = property.units.length - occupiedUnits;
  const openMaintenanceCount = property._count.maintenanceRecords;
  const deleteProperty = deletePropertyAction.bind(null, propertyId);
  const updateFinances = updatePropertyFinancesAction.bind(null, propertyId);

  return (
    <div className="space-y-6">
      <PageBackNav parent={{ href: "/properties", label: "Properties" }} />

      {query.saved === "finances" && (
        <FlashAlert clearParams={["saved"]}>
          Property finances saved. These amounts feed your annual T776 tax summary.
        </FlashAlert>
      )}
      {query.deleted === "unit" && (
        <FlashAlert clearParams={["deleted"]}>Unit deleted.</FlashAlert>
      )}
      {query.joined && (
        <FlashAlert clearParams={["joined"]}>
          You now have {currentRole.toLowerCase()} access to {property.name}.
        </FlashAlert>
      )}
      {query.saved === "invited" && (
        <FlashAlert clearParams={["saved"]}>Invitation sent.</FlashAlert>
      )}
      {query.saved === "invited_no_email" && (
        <FlashAlert variant="warning" clearParams={["saved"]}>
          Invitation created, but the email couldn&apos;t be sent. Copy the invite link below and
          share it directly.
        </FlashAlert>
      )}
      {query.saved === "invite_resent" && (
        <FlashAlert clearParams={["saved"]}>Invitation re-sent.</FlashAlert>
      )}
      {query.saved === "invite_revoked" && (
        <FlashAlert clearParams={["saved"]}>Invitation revoked.</FlashAlert>
      )}
      {query.saved === "role_updated" && (
        <FlashAlert clearParams={["saved"]}>Member role updated.</FlashAlert>
      )}
      {query.saved === "member_removed" && (
        <FlashAlert clearParams={["saved"]}>Member removed.</FlashAlert>
      )}
      {query.error === "already_member" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          That person already has access to this property.
        </FlashAlert>
      )}
      {query.error === "last_owner" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          A property must always have at least one owner.
        </FlashAlert>
      )}
      {query.error === "last_owner_leave" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          You&apos;re the only owner — invite another owner before leaving.
        </FlashAlert>
      )}
      {query.error === "invite_invalid" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Enter a valid email and role to send an invite.
        </FlashAlert>
      )}
      {query.error === "delete_confirm" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Delete cancelled — type the property name exactly to confirm.
        </FlashAlert>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-muted">
            {property.addressLine1}, {property.city}
            {property.province ? `, ${property.province}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/properties/${propertyId}/utility-bills/import`}>
            <Button variant="outline" size="sm">Import bill spreadsheet</Button>
          </Link>
          <Link href={`/properties/${propertyId}/utility-bills/new`}>
            <Button variant="outline" size="sm">Upload bill PDF</Button>
          </Link>
          <Link href={`/properties/${propertyId}/units/new`}>
            <Button size="sm">Add Unit</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Units"
          value={property.units.length}
          hint={`${occupiedUnits} occupied · ${vacantUnits} vacant`}
          icon={Home}
          accent="primary"
        />
        <StatCard
          label="Scheduled rent (all units)"
          value={formatMoney(monthlyRent)}
          icon={CircleDollarSign}
          accent="primary"
        />
        <StatCard
          label="Open maintenance"
          value={openMaintenanceCount}
          icon={Wrench}
          accent={openMaintenanceCount > 0 ? "warning" : "neutral"}
          href={`/maintenance?status=open&propertyId=${propertyId}`}
        />
        <StatCard
          label="Tax & insurance"
          value={
            property.annualPropertyTaxCents || property.annualInsurancePremiumCents
              ? formatMoney(
                  (property.annualPropertyTaxCents ?? 0) +
                    (property.annualInsurancePremiumCents ?? 0)
                )
              : "Not set"
          }
          hint={
            property.annualPropertyTaxCents || property.annualInsurancePremiumCents
              ? [
                  property.annualPropertyTaxCents
                    ? `${formatMoney(property.annualPropertyTaxCents)} tax`
                    : null,
                  property.annualInsurancePremiumCents
                    ? `${formatMoney(property.annualInsurancePremiumCents)} insurance`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Add below for T776"
          }
          icon={Shield}
          accent="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property finances</CardTitle>
          <CardDescription>
            Annual amounts for CRA Form T776 (lines 9180, 9200, 8710). Used in Tax Reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateFinances} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="annualPropertyTax">Annual property tax ($)</Label>
              <Input
                id="annualPropertyTax"
                name="annualPropertyTax"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 4200.00"
                defaultValue={
                  property.annualPropertyTaxCents
                    ? (property.annualPropertyTaxCents / 100).toFixed(2)
                    : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRollNumber">Tax roll / account # (optional)</Label>
              <Input
                id="taxRollNumber"
                name="taxRollNumber"
                defaultValue={property.taxRollNumber ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualInsurancePremium">Annual insurance ($)</Label>
              <Input
                id="annualInsurancePremium"
                name="annualInsurancePremium"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1800.00"
                defaultValue={
                  property.annualInsurancePremiumCents
                    ? (property.annualInsurancePremiumCents / 100).toFixed(2)
                    : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceProvider">Insurer (optional)</Label>
              <Input
                id="insuranceProvider"
                name="insuranceProvider"
                defaultValue={property.insuranceProvider ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mortgageInterestAnnual">Annual mortgage interest ($)</Label>
              <Input
                id="mortgageInterestAnnual"
                name="mortgageInterestAnnual"
                type="number"
                step="0.01"
                min="0"
                placeholder="T776 line 8710"
                defaultValue={
                  property.mortgageInterestAnnualCents
                    ? (property.mortgageInterestAnnualCents / 100).toFixed(2)
                    : ""
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save finances</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Units</CardTitle>
          <Link href={`/properties/${propertyId}/units/new`}>
            <Button size="sm">Add Unit</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {property.units.length === 0 ? (
            <p className="text-sm text-muted">No units yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th>
                  <Th>Tenant</Th>
                  <Th className="hidden sm:table-cell">Rent</Th>
                  <Th className="hidden sm:table-cell">Due Day</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {property.units.map((unit) => {
                  const tenant = unit.tenants[0];
                  return (
                    <Tr key={unit.id}>
                      <Td className="font-medium">
                        <div>{unit.name}</div>
                        <div className="mt-0.5 text-xs text-muted sm:hidden">{formatMoney(unit.rentAmountCents)}</div>
                      </Td>
                      <Td>
                        {tenant ? `${tenant.firstName} ${tenant.lastName}` : (
                          <Badge variant="warning">No tenant</Badge>
                        )}
                      </Td>
                      <Td className="hidden sm:table-cell">{formatMoney(unit.rentAmountCents)}</Td>
                      <Td className="hidden sm:table-cell">{unit.rentDueDay}</Td>
                      <Td className="w-10 pr-3">
                        <Link href={`/properties/${propertyId}/units/${unit.id}`} aria-label={`View unit ${unit.name}`}>
                          <Button variant="ghost" size="sm" className="px-2">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <CardTitle>Documents</CardTitle>
            </div>
            <CardDescription>
              {totalPropertyDocuments === 0
                ? "No documents filed for this property yet."
                : `${totalPropertyDocuments} document${totalPropertyDocuments === 1 ? "" : "s"} filed for this property.`}
            </CardDescription>
          </div>
          <Link href={`/documents?propertyId=${propertyId}`}>
            <Button variant="outline" size="sm">
              Open document hub
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {DOCUMENT_CATEGORIES.map((category) => {
              const count = documentCountByCategory.get(category) ?? 0;
              if (count === 0) return null;
              return (
                <Link
                  key={category}
                  href={`/documents?propertyId=${propertyId}&category=${category}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-colors hover:border-primary/20 hover:bg-primary-muted/30"
                >
                  <FolderOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {DOCUMENT_CATEGORY_LABELS[category]}
                    </span>
                    <span className="block text-xs text-muted">
                      {count} file{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          {recentPropertyDocuments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Recent uploads
              </p>
              <ul className="divide-y divide-border-subtle">
                {recentPropertyDocuments.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      className="flex items-center justify-between gap-3 rounded-lg py-2.5 text-sm transition-colors hover:bg-surface-muted/60"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="truncate font-medium text-foreground">
                          {doc.fileName}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Badge variant="secondary">
                          {DOCUMENT_CATEGORY_LABELS[doc.category]}
                        </Badge>
                        <span className="text-xs text-muted">
                          {doc.createdAt.toLocaleDateString("en-CA")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/properties/${propertyId}/utility-bills/import`}>
          <Button variant="outline" size="sm">Import bill spreadsheet</Button>
        </Link>
        <Link href={`/properties/${propertyId}/utility-bills`}>
          <Button variant="outline" size="sm">Utility bills</Button>
        </Link>
        <Link href={`/billing/statements/generate?propertyId=${propertyId}`}>
          <Button variant="outline" size="sm">Generate monthly statements</Button>
        </Link>
      </div>

      <PropertyMembersCard
        propertyId={propertyId}
        currentUserId={user.id}
        currentRole={currentRole}
        members={members}
        invites={pendingInvites}
        inviteBaseUrl={getAppUrl()}
      />

      {isOwner && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Delete property</CardTitle>
            <CardDescription>
              Permanently removes this property, all units, utility bills, statements, and
              maintenance records. Documents will be unlinked but not deleted. This cannot be
              undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDeleteForm
              action={deleteProperty}
              entityName={property.name}
              buttonLabel="Delete property"
              description="All units and billing data under this property will be removed."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
