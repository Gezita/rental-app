"use client";

import {
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Home,
  Plug,
  CircleDollarSign,
  Receipt,
  ScrollText,
  Settings,
  User,
  Users,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const navIconsByHref: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/properties": Building2,
  "/tenants": Users,
  "/inspections": ClipboardCheck,
  "/billing": Wallet,
  "/billing/statements": Receipt,
  "/billing/utility-bills": Zap,
  "/billing/payments": CircleDollarSign,
  "/billing/tax-reports": FileSpreadsheet,
  "/documents": FileText,
  "/documents/notices": ScrollText,
  "/maintenance": Wrench,
  "/settings": Settings,
  "/settings/profile": User,
  "/settings/integrations": Plug,
};
