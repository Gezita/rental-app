import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  applyUtilityProfileAction,
  deleteUtilityProfileAction,
  saveUtilityProfileAction,
  saveUtilityRulesAction,
} from "@/app/actions";
import { UTILITY_TYPE_LABELS } from "@/lib/billing-constants";
import { describeProfileRules, parseProfileRules } from "@/lib/utility-profiles";
import { FlashAlert } from "@/components/flash-alert";
import { PageBackNav } from "@/components/layout/page-back-nav";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
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
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { propertyId, unitId } = await params;
  const { saved, error } = await searchParams;
  const user = await requireUser();

  const [unit, profiles] = await Promise.all([
    prisma.unit.findFirst({
      where: { id: unitId, propertyId, property: { members: { some: { userId: user.id } } } },
      include: { utilityRules: true, property: true },
    }),
    prisma.utilityProfile.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!unit) notFound();

  const saveRules = saveUtilityRulesAction.bind(null, unitId);
  const saveProfile = saveUtilityProfileAction.bind(null, unitId);
  const applyProfile = applyUtilityProfileAction.bind(null, unitId);
  const deleteProfile = deleteUtilityProfileAction.bind(null, unitId);

  return (
    <div className="space-y-6">
      <PageBackNav
        parent={{
          href: `/properties/${propertyId}/units/${unitId}`,
          label: `${unit.property.name} · ${unit.name}`,
        }}
      />
      <div>
        <h1 className="text-2xl font-bold">Utility split rules</h1>
        <p className="text-muted">
          Define what share of each utility this unit pays. Percentages for the same utility type
          should total 100% across all units in the property.
        </p>
      </div>

      {saved === "1" && <Alert>Saved utility rules.</Alert>}
      {saved === "profile" && (
        <FlashAlert clearParams={["saved"]}>Profile saved from this unit&apos;s rules.</FlashAlert>
      )}
      {saved === "profile_applied" && (
        <FlashAlert clearParams={["saved"]}>
          Profile applied — splits recalculated for the property.
        </FlashAlert>
      )}
      {saved === "profile_deleted" && (
        <FlashAlert clearParams={["saved"]}>Profile deleted.</FlashAlert>
      )}
      {error === "profile_name" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Give the profile a name before saving.
        </FlashAlert>
      )}
      {error === "profile_empty" && (
        <FlashAlert variant="error" clearParams={["error"]}>
          Save split rules for this unit first, then save them as a profile.
        </FlashAlert>
      )}
      {(error === "profile_not_found" || error === "profile_invalid") && (
        <FlashAlert variant="error" clearParams={["error"]}>
          That profile could not be applied.
        </FlashAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Utility profiles</CardTitle>
          <CardDescription>
            Save this unit&apos;s split rules as a reusable preset (e.g. 60/40, equal split,
            basement/main) and apply it to other units in one click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted">
              No saved profiles yet. Configure the rules below, save them, then store them as a
              profile.
            </p>
          ) : (
            <ul className="space-y-2">
              {profiles.map((profile) => (
                <li
                  key={profile.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted">
                      {describeProfileRules(parseProfileRules(profile.rules), UTILITY_TYPE_LABELS)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={applyProfile}>
                      <input type="hidden" name="profileId" value={profile.id} />
                      <SubmitButton size="sm" pendingLabel="Applying…">
                        Apply to this unit
                      </SubmitButton>
                    </form>
                    <form action={deleteProfile}>
                      <input type="hidden" name="profileId" value={profile.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-danger">
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={saveProfile} className="flex flex-wrap items-end gap-3 border-t border-border-subtle pt-4">
            <div className="space-y-2">
              <Label htmlFor="profileName">Save current rules as profile</Label>
              <Input
                id="profileName"
                name="profileName"
                placeholder="e.g. 60/40 main + basement"
                className="w-64"
              />
            </div>
            <SubmitButton variant="outline" pendingLabel="Saving…">
              Save profile
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

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
            <Button type="submit">Save split rules</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
