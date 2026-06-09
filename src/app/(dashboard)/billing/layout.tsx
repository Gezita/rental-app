import { PageTabs } from "@/components/layout/page-tabs";
import { billingTabs } from "@/lib/section-tabs";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageTabs tabs={billingTabs} />
      {children}
    </div>
  );
}
