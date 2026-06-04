import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUtilityRulesAction } from "@/app/actions/app";
import { UTILITY_TYPE_LABELS } from "@/lib/statements";
import { PageBackNav } from "@/components/layout/page-back-nav";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";

const utilityTypes = ["gas", "water", "electricity", "internet", "other"] as const;

export default async function UtilityRulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string; unitId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { propertyId, unitId } = await params;
  const { saved } = await searchParams;
  const user = await requireUser();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, propertyId, property: { userId: user.id } },
    include: { utilityRules: true, property: true },
  });

  if (!unit) notFound();

  const saveRules = saveUtilityRulesAction.bind(null, unitId);

  return (
    <div className="space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/units/${unitId}`,
          label: `${unit.property.name} · ${unit.name}`,
        }}
      />
      <div>
        <h1 className="text-2xl font-bold">Utility Rules</h1>
        <p className="text-slate-500">Define how utility costs are split for this unit</p>
      </div>

      {saved && <Alert>Saved utility rules.</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Split Percentages</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveRules} className="space-y-6">
            {utilityTypes.map((type) => {
              const rule = unit.utilityRules.find((r) => r.utilityType === type);
              return (
                <div key={type} className="rounded-lg border p-4">
                  <h3 className="mb-3 font-medium">{UTILITY_TYPE_LABELS[type]}</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`${type}_tenantPays`}
                        defaultChecked={rule?.tenantPays ?? false}
                      />
                      Tenant pays
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`${type}_includedInRent`}
                        defaultChecked={rule?.includedInRent ?? false}
                      />
                      Included in rent
                    </label>
                    <div className="space-y-1">
                      <Label htmlFor={`${type}_percentage`}>Percentage (%)</Label>
                      <Input
                        id={`${type}_percentage`}
                        name={`${type}_percentage`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        defaultValue={rule?.percentage ?? 0}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <Button type="submit">Save Rules</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
