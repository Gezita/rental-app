export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  children?: NavItem[];
};

export const dashboardNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", exact: true },
  {
    href: "/properties",
    label: "Properties",
    children: [
      { href: "/properties", label: "All properties", exact: true },
      { href: "/tenants", label: "Tenants" },
      { href: "/inspections", label: "Inspections" },
    ],
  },
  {
    href: "/billing",
    label: "Billing",
    children: [
      { href: "/billing", label: "Monthly workflow", exact: true },
      { href: "/billing/statements", label: "Statements" },
      { href: "/billing/utility-bills", label: "Utility bills" },
      { href: "/billing/payments", label: "Payments" },
      { href: "/billing/tax-reports", label: "Tax reports" },
    ],
  },
  {
    href: "/documents",
    label: "Documents",
    children: [
      { href: "/documents", label: "All files", exact: true },
      { href: "/documents/notices", label: "Notices", exact: true },
      { href: "/documents/notices/forms", label: "LTB N forms" },
    ],
  },
  { href: "/maintenance", label: "Maintenance" },
  {
    href: "/settings",
    label: "Settings",
    children: [
      { href: "/settings", label: "Account", exact: true },
      { href: "/settings/profile", label: "Profile" },
      { href: "/settings/integrations", label: "Integrations" },
    ],
  },
];

/** Flat list for consumers that need every route. */
export function flattenNavItems(items: NavItem[] = dashboardNavItems): NavItem[] {
  return items.flatMap((item) =>
    item.children ? [item, ...item.children] : [item]
  );
}

export function isNavItemActive(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(pathname: string, item: NavItem) {
  if (isNavItemActive(pathname, item.href, item.exact)) return true;
  return item.children?.some((child) => isNavItemActive(pathname, child.href, child.exact));
}
