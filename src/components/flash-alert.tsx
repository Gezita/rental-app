"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui";
import { cn } from "@/lib/utils";

type FlashAlertProps = {
  children: React.ReactNode;
  variant?: "default" | "warning" | "error" | "info";
  className?: string;
  /** Query params to remove from the URL when dismissed */
  clearParams?: string[];
  autoDismissMs?: number;
};

export function FlashAlert({
  children,
  variant = "default",
  className,
  clearParams = [],
  autoDismissMs = 6000,
}: FlashAlertProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (clearParams.length === 0 || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    let changed = false;
    for (const key of clearParams) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const next = `${url.pathname}${url.search}${url.hash}`;
      router.replace(next, { scroll: false });
    }
  }, [clearParams, router]);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = window.setTimeout(dismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, dismiss]);

  if (!visible) return null;

  return (
    <Alert
      variant={variant}
      className={cn("relative pr-10", className)}
      role="status"
    >
      {children}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-md p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss message"
      >
        ×
      </button>
    </Alert>
  );
}
