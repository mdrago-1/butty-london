import { createServerFn } from "@tanstack/react-start";
import { managerMiddleware } from "@/lib/staff-middleware";
import type { StaffRole } from "@/lib/staff";

export const getStaffSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ role: StaffRole } | null> => {
    const { readStaffRole } = await import("@/lib/staff.server");
    const role = await readStaffRole();
    return role ? { role } : null;
  },
);

export const staffLogin = createServerFn({ method: "POST" })
  .validator((input: { role: StaffRole; password: string }) => input)
  .handler(async ({ data }): Promise<{ role: StaffRole }> => {
    const password = data.password;
    if (password.length < 6) throw new Error("Password is too short.");
    const { passwordMatches, signStaffCookie } = await import(
      "@/lib/staff.server"
    );
    const ok = await passwordMatches(data.role, password);
    if (!ok) throw new Error("That password didn't match.");
    await signStaffCookie(data.role);
    return { role: data.role };
  });

export const staffLogout = createServerFn({ method: "POST" }).handler(
  async () => {
    const { clearStaffCookie } = await import("@/lib/staff.server");
    clearStaffCookie();
    return { ok: true as const };
  },
);

export const setStaffPassword = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator(
    (input: { role: StaffRole; password: string; current?: string }) => input,
  )
  .handler(async ({ data }) => {
    const next = data.password.trim();
    if (next.length < 6) throw new Error("Use at least 6 characters.");
    const { passwordMatches, saveStaffPassword } = await import(
      "@/lib/staff.server"
    );
    if (data.role === "manager") {
      const current = data.current || "";
      if (!(await passwordMatches("manager", current))) {
        throw new Error("Current office password didn't match.");
      }
    }
    await saveStaffPassword(data.role, next);
    return { ok: true as const };
  });
