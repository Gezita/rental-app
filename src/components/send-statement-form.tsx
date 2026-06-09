"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Button } from "@/components/ui";

type SendStatementFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  tenantEmail?: string | null;
  tenantName: string;
  totalDueLabel: string;
};

export function SendStatementForm({
  action,
  tenantEmail,
  tenantName,
  totalDueLabel,
}: SendStatementFormProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!tenantEmail) {
    return (
      <Alert variant="warning">
        Add a tenant email before sending this statement.
      </Alert>
    );
  }

  if (!confirmed) {
    return (
      <div className="space-y-3">
        <Alert variant="info">
          You are about to email {tenantName} at {tenantEmail} a statement for {totalDueLabel}.
          Review the PDF preview first if you have not already.
        </Alert>
        <Button type="button" className="w-full" onClick={() => setConfirmed(true)}>
          Continue to send
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <Alert variant="warning">
        Confirm send to {tenantEmail}. This marks the statement as sent and attaches the PDF.
      </Alert>
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Email statement to tenant
      </SubmitButton>
      <Button type="button" variant="ghost" className="w-full" onClick={() => setConfirmed(false)}>
        Cancel
      </Button>
    </form>
  );
}
