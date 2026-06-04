import { Badge } from "@/components/ui";
import { getPaymentStatus, type PaymentStatusInfo } from "@/lib/payment-status";

export function PaymentStatusBadge(statement: {
  status: Parameters<typeof getPaymentStatus>[0]["status"];
  totalDueCents: number;
  paidAmountCents: number;
  stripeCheckoutSessionId?: string | null;
}) {
  const info: PaymentStatusInfo = getPaymentStatus(statement);
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
