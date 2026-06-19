import type { PropertyRole } from "@prisma/client";

/** Days a property invite stays valid before it must be re-sent. */
export const INVITE_TTL_DAYS = 14;

export const PROPERTY_ROLES: PropertyRole[] = ["OWNER", "MANAGER", "VIEWER"];

export const ROLE_LABELS: Record<PropertyRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<PropertyRole, string> = {
  OWNER: "Full control. Can edit the property, bill tenants, and invite or remove people.",
  MANAGER:
    "Can edit the property, manage units and tenants, and send statements. Cannot remove people or delete the property.",
  VIEWER: "Read-only. Can see statements, payments, and documents but cannot change anything.",
};

export function inviteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Roles that can be granted via invite (anyone can be an Owner, Manager, or Viewer). */
export function isAssignableRole(value: string): value is PropertyRole {
  return (PROPERTY_ROLES as string[]).includes(value);
}
