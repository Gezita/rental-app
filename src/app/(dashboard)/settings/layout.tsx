import { PageTabs } from "@/components/layout/page-tabs";
import { settingsTabs } from "@/lib/section-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageTabs tabs={settingsTabs} />
      {children}
    </div>
  );
}
