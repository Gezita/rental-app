import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
};

type OnboardingChecklistProps = {
  steps: OnboardingStep[];
};

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const completed = steps.filter((step) => step.done).length;
  const allDone = completed === steps.length;

  if (allDone) return null;

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-surface via-surface to-primary-muted/50">
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <CardDescription>
          {completed} of {steps.length} steps complete — follow this checklist for your first
          month-end billing run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                  step.done
                    ? "border-border-subtle bg-surface-muted/40 text-muted"
                    : "border-border bg-surface shadow-[var(--shadow-sm)] hover:border-primary/25 hover:bg-primary-muted/30"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                )}
                <span className="min-w-0">
                  <span
                    className={cn(
                      "font-medium",
                      step.done ? "text-muted line-through" : "text-foreground"
                    )}
                  >
                    {index + 1}. {step.label}
                  </span>
                  {!step.done && (
                    <span className="mt-0.5 block text-muted">{step.description}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
