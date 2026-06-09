export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  children?: NavItem[];
};

export const dashboardNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  {
    href: "/properties",
    label: "Properties",
    children: [
      { href: "/properties", label: "All properties", exact: true },
      { href: "/tenants", label: "Tenants" },
      { href: "/utility-bills", label: "Utility bills" },
      { href: "/inspections", label: "Inspections" },
    ],
  },
  { href: "/statements", label: "Statements" },
  { href: "/reports/tax", label: "Tax Reports" },
  { href: "/notices", label: "LTB Notices" },
  { href: "/documents", label: "Documents" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/profile", label: "Profile" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

/** Flat list for mobile menu and other consumers that need every route. */
export function flattenNavItems(items: NavItem[] = dashboardNavItems): NavItem[] {
  return items.flatMap((item) =>
    item.children ? [item, ...item.children] : [item]
  );
}

export const mobileNavSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Navigate",
    items: dashboardNavItems
      .filter(
        (item) =>
          item.href !== "/profile" && item.href !== "/integrations" && item.href !== "/settings"
      )
      .flatMap((item) => item.children ?? [item]),
  },
  {
    label: "Account",
    items: dashboardNavItems.filter(
      (item) =>
        item.href === "/profile" || item.href === "/integrations" || item.href === "/settings"
    ),
  },
];

export function isNavItemActive(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(pathname: string, item: NavItem) {
  if (isNavItemActive(pathname, item.href, item.exact)) return true;
  return item.children?.some((child) => isNavItemActive(pathname, child.href, child.exact));
}
