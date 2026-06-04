"use client";

import {
  Building2,
  FileText,
  Home,
  Receipt,
  ScrollText,
  Settings,
  User,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const navIconsByHref: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/properties": Building2,
  "/statements": Receipt,
  "/notices": ScrollText,
  "/documents": FileText,
  "/maintenance": Wrench,
  "/profile": User,
  "/settings": Settings,
};
