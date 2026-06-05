export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export const dashboardNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/properties", label: "Properties" },
  { href: "/utility-bills", label: "Utility Bills" },
  { href: "/statements", label: "Statements" },
  { href: "/notices", label: "LTB Notices" },
  { href: "/documents", label: "Documents" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export const mobileNavSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Navigate",
    items: dashboardNavItems.filter((item) => item.href !== "/profile" && item.href !== "/settings"),
  },
  {
    label: "Account",
    items: dashboardNavItems.filter((item) => item.href === "/profile" || item.href === "/settings"),
  },
];
