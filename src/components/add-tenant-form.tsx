"use client";

import Link from "next/link";
import { useState } from "react";
import type { LeaseDraftData } from "@/app/actions/lease-signing";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

type AddTenantFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  leaseDraft: LeaseDraftData | null;
  leaseWizardHref: string;
  today: string;
  submitLabel?: string;
  showMoveOutNote?: boolean;
};

type InputMode = "manual" | "from_lease";

export function AddTenantForm({
  action,
  leaseDraft,
  leaseWizardHref,
  today,
  submitLabel = "Add tenant",
  showMoveOutNote = false,
}: AddTenantFormProps) {
  const hasDraft = Boolean(
    leaseDraft?.firstName && leaseDraft?.lastName
  );
  const [mode, setMode] = useState<InputMode>(hasDraft ? "from_lease" : "manual");

  const values =
    mode === "from_lease" && leaseDraft
      ? leaseDraft
      : {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          moveInDate: today,
          emergencyContactName: "",
          emergencyContactPhone: "",
        };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "manual"
              ? "border-primary/30 bg-primary-muted text-primary-hover"
              : "border-border bg-surface text-muted-foreground hover:bg-surface-muted"
          )}
        >
          Enter manually
        </button>
        <button
          type="button"
          onClick={() => setMode("from_lease")}
          disabled={!hasDraft}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "from_lease"
              ? "border-primary/30 bg-primary-muted text-primary-hover"
              : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
            !hasDraft && "cursor-not-allowed opacity-50"
          )}
        >
          From lease wizard
        </button>
      </div>

      {mode === "from_lease" && !hasDraft && (
        <p className="text-sm text-muted">
          No lease draft saved yet.{" "}
          <Link href={leaseWizardHref} className="font-medium text-primary-hover underline">
            Fill the Ontario Standard Lease wizard
          </Link>{" "}
          and save tenant details first.
        </p>
      )}

      {mode === "from_lease" && hasDraft && (
        <p className="text-sm text-muted">
          Tenant details pulled from your saved lease wizard draft.{" "}
          <Link href={leaseWizardHref} className="font-medium text-primary-hover underline">
            Edit in wizard
          </Link>
        </p>
      )}

      <form action={action} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={values.firstName}
            required
            readOnly={mode === "from_lease" && hasDraft}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={values.lastName}
            required
            readOnly={mode === "from_lease" && hasDraft}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email}
            readOnly={mode === "from_lease" && hasDraft}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={values.phone}
            readOnly={mode === "from_lease" && hasDraft}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="moveInDate">Move-in date</Label>
          <Input
            id="moveInDate"
            name="moveInDate"
            type="date"
            defaultValue={values.moveInDate || today}
            required
            readOnly={mode === "from_lease" && hasDraft}
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="sendWelcomeEmail"
            name="sendWelcomeEmail"
            type="checkbox"
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="sendWelcomeEmail" className="font-normal">
            Email onboarding package to new tenant
          </Label>
        </div>
        {showMoveOutNote && (
          <p className="md:col-span-2 text-xs text-muted">
            Adding a new tenant will mark the current tenant as moved out on the move-in date.
          </p>
        )}
        <div className="md:col-span-2">
          <Button type="submit" disabled={mode === "from_lease" && !hasDraft}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
