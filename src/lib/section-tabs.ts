import type { PageTab } from "@/components/layout/page-tabs";

export const billingTabs: PageTab[] = [
  { href: "/billing", label: "Monthly workflow", exact: true },
  { href: "/billing/statements", label: "Statements" },
  { href: "/billing/utility-bills", label: "Utility bills" },
  { href: "/billing/payments", label: "Payments" },
  { href: "/billing/tax-reports", label: "Tax reports" },
];

export const documentsTabs: PageTab[] = [
  { href: "/documents", label: "All files", exact: true },
  { href: "/documents/notices", label: "Notices", exact: true },
  { href: "/documents/notices/forms", label: "LTB N forms" },
];

export const settingsTabs: PageTab[] = [
  { href: "/settings", label: "Account", exact: true },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/integrations", label: "Integrations" },
];

export const portfolioTabs: PageTab[] = [
  { href: "/properties", label: "All properties", exact: true },
  { href: "/tenants", label: "Tenants" },
  { href: "/inspections", label: "Inspections" },
];
