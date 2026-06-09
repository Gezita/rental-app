"use client";

import {
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Home,
  Plug,
  Receipt,
  ScrollText,
  Settings,
  User,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const navIconsByHref: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/properties": Building2,
  "/tenants": Users,
  "/utility-bills": Zap,
  "/inspections": ClipboardCheck,
  "/statements": Receipt,
  "/reports/tax": FileSpreadsheet,
  "/notices": ScrollText,
  "/documents": FileText,
  "/maintenance": Wrench,
  "/profile": User,
  "/integrations": Plug,
  "/settings": Settings,
};
