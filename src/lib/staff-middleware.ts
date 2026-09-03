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

export const tillOperatorMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const { requireTillOperator } = await import("@/lib/staff.server");
  const till = await requireTillOperator();
  return next({
    context: {
      staffRole: till.role,
      employeeId: till.employeeId!,
      employeeName: till.employeeName || "",
      tillRole: till.tillRole || "cashier",
    },
  });
});

export const teamAdminMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const { requireTeamAdmin } = await import("@/lib/staff.server");
  const session = await requireTeamAdmin();
  return next({
    context: {
      staffRole: session.role,
      tillRole: session.tillRole,
    },
  });
});
