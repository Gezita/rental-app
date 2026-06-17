"use client";

import { useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui";
import type { ButtonSize } from "@/components/ui";

export function TenantPayButton({
  statementId,
  disabled,
  label = "Pay now",
  pendingLabel = "Opening checkout…",
  variant = "default",
  size = "default",
  className,
}: {
  statementId?: string;
  disabled?: boolean;
  label?: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementId ? { statementId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={size === "default" ? "w-full" : undefined}
        onClick={handlePay}
        disabled={disabled || loading}
      >
        {loading ? pendingLabel : label}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function TenantSetupAutopayButton({
  disabled,
  label = "Set up auto-pay",
}: {
  disabled?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/stripe/setup-autopay", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start setup");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleSetup}
        disabled={disabled || loading}
      >
        {loading ? "Opening secure form…" : label}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
