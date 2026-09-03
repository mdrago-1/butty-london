import { createServerFn } from "@tanstack/react-start";
import {
  managerMiddleware,
  teamAdminMiddleware,
} from "@/lib/staff-middleware";
import {
  hoursRange,
  normalizePin,
  parseTillRole,
  type ShiftTotals,
  type StaffEmployee,
  type StaffRole,
  type StaffSession,
  type StaffShift,
  type TillPerson,
  type TillRole,
} from "@/lib/staff";

export const getStaffSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffSession | null> => {
    const { readStaffSession, getOpenShift, getEmployee, signStaffCookie } =
      await import("@/lib/staff.server");
    const s = await readStaffSession();
    if (!s) return null;
    if (s.employeeId) {
      const emp = await getEmployee(s.employeeId);
      const open = emp?.active ? await getOpenShift(s.employeeId) : null;
      if (!emp?.active || !open) {
        if (s.till) {
          const next: StaffSession = { role: "kitchen", till: true };
          await signStaffCookie(next);
          return next;
        }
        return {
          role: s.role,
          till: s.till,
          clockInAt: null,
        };
      }
      return {
        role: s.till ? "kitchen" : s.role,
        till: s.till,
        employeeId: emp.id,
        employeeName: emp.name,
        tillRole: emp.tillRole,
        clockInAt: open.clockIn,
      };
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

export const listTillRoster = createServerFn({ method: "POST" }).handler(
  async (): Promise<TillPerson[]> => {
    const { listTillRoster: list } = await import("@/lib/staff.server");
    return list();
  },
);

export const tillIdentify = createServerFn({ method: "POST" })
  .validator((input: { employeeId: string; pin: string }) => input)
  .handler(async ({ data }): Promise<StaffSession> => {
    const { identifyTill } = await import("@/lib/staff.server");
    return identifyTill(data.employeeId, normalizePin(data.pin));
  });

export const clockOutTill = createServerFn({ method: "POST" }).handler(
  async (): Promise<ShiftTotals> => {
    const { clockOutCurrent } = await import("@/lib/staff.server");
    return clockOutCurrent();
  },
);

export const forceClockOutTill = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { forceClockOutEmployee } = await import("@/lib/staff.server");
    await forceClockOutEmployee(data.id);
    return { ok: true as const };
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
    (input: {
      from?: string;
      to?: string;
      range?: "week" | "lastWeek" | "month";
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      employees: StaffEmployee[];
      shifts: StaffShift[];
      from: string;
      to: string;
    }> => {
      const r =
        data.from && data.to
          ? { from: data.from, to: data.to }
          : hoursRange(data.range || "week");
      const { listTeam } = await import("@/lib/staff.server");
      const team = await listTeam(r.from, r.to);
      return { ...team, from: r.from, to: r.to };
    },
  );

export const addStaffEmployee = createServerFn({ method: "POST" })
  .middleware([teamAdminMiddleware])
  .validator(
    (input: { name: string; pin: string; tillRole?: TillRole }) => input,
  )
  .handler(async ({ data }): Promise<StaffEmployee> => {
    const { createEmployee } = await import("@/lib/staff.server");
    return createEmployee(
      data.name,
      normalizePin(data.pin),
      parseTillRole(data.tillRole),
    );
  });

export const setStaffEmployeePin = createServerFn({ method: "POST" })
  .middleware([teamAdminMiddleware])
  .validator((input: { id: string; pin: string }) => input)
  .handler(async ({ data }) => {
    const { setEmployeePin } = await import("@/lib/staff.server");
    await setEmployeePin(data.id, normalizePin(data.pin));
    return { ok: true as const };
  });

export const setStaffEmployeeRole = createServerFn({ method: "POST" })
  .middleware([teamAdminMiddleware])
  .validator((input: { id: string; tillRole: TillRole }) => input)
  .handler(async ({ data }) => {
    const { setEmployeeRole } = await import("@/lib/staff.server");
    await setEmployeeRole(data.id, parseTillRole(data.tillRole));
    return { ok: true as const };
  });

export const setStaffEmployeeActive = createServerFn({ method: "POST" })
  .middleware([teamAdminMiddleware])
  .validator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    const { setEmployeeActive } = await import("@/lib/staff.server");
    await setEmployeeActive(data.id, data.active);
    return { ok: true as const };
  });

export const renameStaffEmployee = createServerFn({ method: "POST" })
  .middleware([teamAdminMiddleware])
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
