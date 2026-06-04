"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function PayWithStripeButton({
  payToken,
  disabled,
}: {
  payToken: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not start checkout");
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        onClick={handlePay}
        disabled={disabled || loading}
      >
        {loading ? "Redirecting…" : "Pay with card (Stripe)"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
