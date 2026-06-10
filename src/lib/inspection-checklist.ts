export const DEFAULT_INSPECTION_CHECKLIST = [
  "Exterior and front entrance",
  "Kitchen appliances and counters",
  "Bathroom fixtures and ventilation",
  "Walls, ceilings, and paint",
  "Floors, carpets, and baseboards",
  "Windows, screens, and blinds",
  "Heating and cooling",
  "Smoke and CO detectors",
  "Electrical outlets and switches",
  "Plumbing (leaks, water pressure, drains)",
  "Closets and storage areas",
  "Keys, locks, and mailbox",
] as const;

export const INSPECTION_ITEM_STATUS_LABELS = {
  pending: "Not checked",
  pass: "Pass",
  fail: "Issue found",
  na: "N/A",
} as const;
