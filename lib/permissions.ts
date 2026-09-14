import { cafeAdmin } from "./auth";
import { STAFF_PERMISSION_MATRIX, can, type Permission, type StaffRole } from "./role-permissions";

export const STAFF_ROLES = {
  CASHIER: { label: "Cashier", description: "Create orders and view customer details." },
  MANAGER: { label: "Manager", description: "Manage day-to-day café operations, CRM and loyalty." },
} as const;
export type { Permission, StaffRole };
export { can };

export async function requirePermission(permission: Permission) {
  const s = await cafeAdmin();
  if (s.user.role === "SUPER_ADMIN" || s.user.role === "CAFE_ADMIN") return s;
  if (s.user.role !== "STAFF") throw new Error("UNAUTHORIZED");
  const role = (s.user.staffRole || "CASHIER") as StaffRole;
  if (!STAFF_PERMISSION_MATRIX[role]?.includes(permission)) throw new Error("FORBIDDEN");
  return s;
}

export async function requireOwner() {
  const s = await cafeAdmin();
  if (s.user.role !== "CAFE_ADMIN" && s.user.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return s;
}
