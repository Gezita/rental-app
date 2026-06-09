import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type StatementWorkflowStep = "draft" | "review" | "sent" | "paid";

type StatementWorkflowStepsProps = {
  current: StatementWorkflowStep;
  className?: string;
};

const STEPS: { id: StatementWorkflowStep; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "sent", label: "Sent" },
  { id: "paid", label: "Paid" },
];

function stepIndex(step: StatementWorkflowStep) {
  return STEPS.findIndex((item) => item.id === step);
}

export function StatementWorkflowSteps({ current, className }: StatementWorkflowStepsProps) {
  const currentIndex = stepIndex(current);

  return (
    <ol className={cn("flex flex-wrap gap-2", className)}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li
            key={step.id}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
              done && "border-success/30 bg-success-muted text-success",
              active && "border-primary/30 bg-primary-muted text-primary-hover",
              !done && !active && "border-border bg-surface-muted/50 text-muted"
            )}
          >
            {done ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <span className="text-xs tabular-nums">{index + 1}</span>
            )}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export function deriveStatementWorkflowStep(statement: {
  status: string;
  paidAmountCents: number;
  totalDueCents: number;
  pdfDocumentId?: string | null;
  emailSentAt?: Date | null;
}): StatementWorkflowStep {
  if (statement.status === "paid" || statement.paidAmountCents >= statement.totalDueCents) {
    return "paid";
  }
  if (
    statement.status === "sent" ||
    statement.status === "overdue" ||
    statement.status === "partial" ||
    statement.emailSentAt
  ) {
    return "sent";
  }
  if (statement.pdfDocumentId) {
    return "review";
  }
  return "draft";
}
