export type StaffRole = "CASHIER" | "MANAGER";
export type Permission = "POS" | "CUSTOMERS" | "ORDERS" | "CRM" | "LOYALTY" | "REWARDS" | "CAMPAIGNS" | "AUTOMATIONS" | "REFERRALS" | "FEEDBACK" | "MENU" | "ANALYTICS" | "MEMBERSHIP" | "SETTINGS" | "BILLING" | "TEAM" | "AUDIT";

export const STAFF_PERMISSION_MATRIX: Record<StaffRole, readonly Permission[]> = {
  CASHIER: ["POS", "CUSTOMERS", "ORDERS"],
  MANAGER: ["POS", "CUSTOMERS", "ORDERS", "CRM", "LOYALTY", "REWARDS", "CAMPAIGNS", "AUTOMATIONS", "REFERRALS", "FEEDBACK", "MENU", "ANALYTICS", "MEMBERSHIP"],
};

export function can(role: string, permission: Permission) {
  return !!STAFF_PERMISSION_MATRIX[role as StaffRole]?.includes(permission);
}
