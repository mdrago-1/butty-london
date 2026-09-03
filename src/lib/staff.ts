export type StaffRole = "kitchen" | "manager";

export type TillRole = "cashier" | "shift_lead" | "manager";

export const TILL_ROLES: TillRole[] = ["cashier", "shift_lead", "manager"];

export type StaffSession = {
  role: StaffRole;
  till?: boolean;
  employeeId?: string;
  employeeName?: string;
  tillRole?: TillRole;
  clockInAt?: string | null;
};

export type StaffEmployee = {
  id: string;
  name: string;
  active: boolean;
  onShift: boolean;
  clockInAt: string | null;
  hoursInRange: number;
  shiftCount: number;
  tillRole: TillRole;
};

export type StaffShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  open: boolean;
};

export type TillPerson = {
  id: string;
  name: string;
  tillRole: TillRole;
  onShift: boolean;
  clockInAt: string | null;
};

export type ShiftTotals = {
  employeeId: string;
  employeeName: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  tickets: number;
  takings: number;
};

export function parseTillRole(v: unknown): TillRole {
  if (v === "shift_lead" || v === "manager" || v === "cashier") return v;
  return "cashier";
}

export function tillRoleLabel(role: TillRole): string {
  if (role === "shift_lead") return "Shift lead";
  if (role === "manager") return "Manager";
  return "Cashier";
}

export function canManageTeam(role?: TillRole | null): boolean {
  return role === "manager";
}

export function canVoidTickets(role?: TillRole | null): boolean {
  return role === "manager";
}

export function canForceClockOut(
  actor?: TillRole | null,
  target?: TillRole | null,
): boolean {
  if (actor === "manager") return true;
  if (actor === "shift_lead" && (target ?? "cashier") === "cashier") return true;
  return false;
}

export function normalizePin(raw: string): string {
  return String(raw || "").replace(/\D/g, "").slice(0, 4);
}

export function pinOk(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Decimal hours, 2 places. */
export function shiftHours(clockIn: string, clockOut?: string | null): number {
  const start = Date.parse(clockIn);
  const end = clockOut ? Date.parse(clockOut) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round(((end - start) / 3600000) * 100) / 100;
}

export function londonYmd(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function londonWeekdayMon0(d = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[wd] ?? 0;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export type HoursRange = { from: string; to: string; label: string };

export function hoursRange(kind: "week" | "lastWeek" | "month"): HoursRange {
  const today = londonYmd();
  if (kind === "month") {
    const from = `${today.slice(0, 7)}-01`;
    const to = addDaysYmd(from, 32).slice(0, 8) + "01";
    return { from, to, label: "This month" };
  }
  const weekStart = addDaysYmd(today, -londonWeekdayMon0());
  if (kind === "lastWeek") {
    const from = addDaysYmd(weekStart, -7);
    return { from, to: weekStart, label: "Last week" };
  }
  return { from: weekStart, to: addDaysYmd(weekStart, 7), label: "This week" };
}

export function fmtLondonTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  });
}

export function fmtLondonDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function fmtLondonYmd(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(t));
}

function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function shiftsToCsv(rows: StaffShift[]): string {
  const header = "Employee,Date,Clock in,Clock out,Hours";
  const lines = rows.map((r) =>
    [
      csvCell(r.employeeName),
      csvCell(fmtLondonYmd(r.clockIn)),
      csvCell(fmtLondonTime(r.clockIn)),
      csvCell(r.clockOut ? fmtLondonTime(r.clockOut) : "open"),
      r.hours.toFixed(2),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
