"use client";

import { useEffect, useState, useTransition } from "react";
import { previewUtilityBillSplitsAction } from "@/app/actions/statements";
import type { UtilitySplitPreviewRow } from "@/lib/utility-split-preview";
import { UtilitySplitPreviewTable } from "@/components/utility-split-preview-table";
import { Button, Input, Label, Select } from "@/components/ui";

type UtilityBillUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultPeriodStart: string;
  defaultPeriodEnd: string;
  propertyId: string;
};

export function UtilityBillUploadForm({
  action,
  defaultPeriodStart,
  defaultPeriodEnd,
  propertyId,
}: UtilityBillUploadFormProps) {
  const [utilityType, setUtilityType] = useState("gas");
  const [amount, setAmount] = useState("");
  const [previewRows, setPreviewRows] = useState<UtilitySplitPreviewRow[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isPreviewing, startPreview] = useTransition();

  useEffect(() => {
    if (!amount.trim()) {
      setPreviewRows([]);
      setPreviewTotal(0);
      return;
    }

    startPreview(async () => {
      const result = await previewUtilityBillSplitsAction(propertyId, utilityType, amount);
      setPreviewRows(result.rows);
      setPreviewTotal(result.totalAmountCents);
    });
  }, [propertyId, utilityType, amount]);

  return (
    <form action={action} className="space-y-4" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="utilityType">Utility type</Label>
        <Select
          id="utilityType"
          name="utilityType"
          value={utilityType}
          onChange={(event) => setUtilityType(event.target.value)}
        >
          <option value="gas">Gas</option>
          <option value="water">Water</option>
          <option value="electricity">Electricity</option>
          <option value="internet">Internet</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="providerName">Provider</Label>
        <Input id="providerName" name="providerName" placeholder="Enbridge, Hydro One..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount ($)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billingPeriodStart">Period start</Label>
          <Input
            id="billingPeriodStart"
            name="billingPeriodStart"
            type="date"
            defaultValue={defaultPeriodStart}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingPeriodEnd">Period end</Label>
          <Input
            id="billingPeriodEnd"
            name="billingPeriodEnd"
            type="date"
            defaultValue={defaultPeriodEnd}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Bill PDF or image</Label>
        <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">Split preview</p>
        <p className="mb-3 text-sm text-muted">
          Preview how this bill will be divided across units before saving.
        </p>
        {isPreviewing ? (
          <p className="text-sm text-muted">Calculating splits…</p>
        ) : (
          <UtilitySplitPreviewTable rows={previewRows} totalAmountCents={previewTotal} />
        )}
      </div>

      <Button type="submit">Save bill</Button>
    </form>
  );
}
