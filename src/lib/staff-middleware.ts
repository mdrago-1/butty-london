import { createMiddleware } from "@tanstack/react-start";
import type { StaffRole } from "@/lib/staff";

function staffMiddleware(min: StaffRole) {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    const staffRole = await requireStaff(min);
    return next({ context: { staffRole } });
  });
}

export const kitchenMiddleware = staffMiddleware("kitchen");
export const managerMiddleware = staffMiddleware("manager");
