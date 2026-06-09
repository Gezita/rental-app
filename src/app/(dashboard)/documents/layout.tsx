import { PageTabs } from "@/components/layout/page-tabs";
import { documentsTabs } from "@/lib/section-tabs";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageTabs tabs={documentsTabs} />
      {children}
    </div>
  );
}
