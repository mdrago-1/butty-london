import { createServerFn } from "@tanstack/react-start";
import { managerMiddleware } from "@/lib/staff-middleware";
import {
  hoursRange,
  normalizePin,
  type StaffEmployee,
  type StaffRole,
  type StaffSession,
  type StaffShift,
} from "@/lib/staff";

export const getStaffSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffSession | null> => {
    const { readStaffSession, getOpenShift } = await import(
      "@/lib/staff.server"
    );
    const s = await readStaffSession();
    if (!s) return null;
    if (s.employeeId) {
      const open = await getOpenShift(s.employeeId);
      return { ...s, clockInAt: open?.clockIn ?? null };
    }
    return s;
  },
);

export const staffLogin = createServerFn({ method: "POST" })
  .validator((input: { role: StaffRole; password: string }) => input)
  .handler(async ({ data }): Promise<StaffSession> => {
    const password = data.password;
    if (password.length < 6) throw new Error("Password is too short.");
    const { passwordMatches, signStaffCookie } = await import(
      "@/lib/staff.server"
    );
    const ok = await passwordMatches(data.role, password);
    if (!ok) throw new Error("That password didn't match.");
    const session: StaffSession = { role: data.role };
    await signStaffCookie(session);
    return session;
  });

export const staffPinLogin = createServerFn({ method: "POST" })
  .validator((input: { pin: string }) => input)
  .handler(async ({ data }): Promise<StaffSession> => {
    const { loginWithPin } = await import("@/lib/staff.server");
    return loginWithPin(normalizePin(data.pin));
  });

export const staffLogout = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const d =
      input && typeof input === "object"
        ? (input as { endShift?: boolean })
        : {};
    return { endShift: !!d.endShift };
  })
  .handler(async ({ data }) => {
    const { readStaffSession, clockOut, clearStaffCookie } = await import(
      "@/lib/staff.server"
    );
    const s = await readStaffSession();
    if (data.endShift && s?.employeeId) {
      await clockOut(s.employeeId);
    }
    clearStaffCookie();
    return { ok: true as const };
  });

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

export const listStaffTeam = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator(
    (input: { from?: string; to?: string; range?: "week" | "lastWeek" | "month" }) =>
      input,
  )
  .handler(
    async ({
      data,
    }): Promise<{ employees: StaffEmployee[]; shifts: StaffShift[]; from: string; to: string }> => {
      const r = data.from && data.to
        ? { from: data.from, to: data.to }
        : hoursRange(data.range || "week");
      const { listTeam } = await import("@/lib/staff.server");
      const team = await listTeam(r.from, r.to);
      return { ...team, from: r.from, to: r.to };
    },
  );

export const addStaffEmployee = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { name: string; pin: string }) => input)
  .handler(async ({ data }): Promise<StaffEmployee> => {
    const { createEmployee } = await import("@/lib/staff.server");
    return createEmployee(data.name, normalizePin(data.pin));
  });

export const setStaffEmployeePin = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { id: string; pin: string }) => input)
  .handler(async ({ data }) => {
    const { setEmployeePin } = await import("@/lib/staff.server");
    await setEmployeePin(data.id, normalizePin(data.pin));
    return { ok: true as const };
  });

export const setStaffEmployeeActive = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    const { setEmployeeActive } = await import("@/lib/staff.server");
    await setEmployeeActive(data.id, data.active);
    return { ok: true as const };
  });

export const renameStaffEmployee = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { id: string; name: string }) => input)
  .handler(async ({ data }) => {
    const { renameEmployee } = await import("@/lib/staff.server");
    await renameEmployee(data.id, data.name);
    return { ok: true as const };
  });

export const clockOutStaffEmployee = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { clockOut } = await import("@/lib/staff.server");
    await clockOut(data.id);
    return { ok: true as const };
  });
