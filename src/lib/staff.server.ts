import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import {
  canForceClockOut,
  parseTillRole,
  pinOk,
  shiftHours,
  type ShiftTotals,
  type StaffEmployee,
  type StaffRole,
  type StaffSession,
  type StaffShift,
  type TillPerson,
  type TillRole,
} from "@/lib/staff";

export type { StaffRole, StaffSession, ShiftTotals, TillPerson };

const COOKIE = "butty_staff";
const MAX_AGE = 60 * 60 * 12;
const TILL_MAX_AGE = 60 * 60 * 24 * 7;
const PIN_FAIL_WINDOW_MS = 10 * 60 * 1000;
const PIN_FAIL_LIMIT = 8;

export class StaffAuthError extends Error {
  readonly status = 401;
  constructor(message = "Staff sign-in required") {
    super(message);
    this.name = "StaffAuthError";
  }
}

function secretBytes(): Uint8Array {
  const s =
    process.env.BETTER_AUTH_SECRET ||
    process.env.STAFF_COOKIE_SECRET ||
    "butty-staff-preview";
  return new TextEncoder().encode(s);
}

function envPassword(role: StaffRole): string | undefined {
  const raw =
    role === "kitchen"
      ? process.env.STAFF_KITCHEN_PASSWORD
      : process.env.STAFF_MANAGER_PASSWORD;
  const v = raw?.trim();
  if (v) return v;
  if (process.env.VERCEL === "1") return undefined;
  return role === "kitchen" ? "Southfields8" : "ButtyOffice8";
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const next = scryptSync(password, salt, 32);
    const prev = Buffer.from(hash, "hex");
    if (next.length !== prev.length) return false;
    return timingSafeEqual(next, prev);
  } catch {
    return false;
  }
}

function safeEq(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function pinKey(pin: string): string {
  return createHmac("sha256", Buffer.from(secretBytes()))
    .update(`till-pin:${pin}`)
    .digest("hex");
}

async function storedHash(role: StaffRole): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{
    kitchen_password_hash: string;
    manager_password_hash: string;
  }>`
    select kitchen_password_hash, manager_password_hash
    from shop_settings where id = 1
  `;
  const row = rows[0];
  const hash =
    role === "kitchen"
      ? row?.kitchen_password_hash
      : row?.manager_password_hash;
  return (hash || "").trim();
}

export async function passwordMatches(
  role: StaffRole,
  password: string,
): Promise<boolean> {
  if (!password) return false;
  const hash = await storedHash(role);
  if (hash) return verifyHash(password, hash);
  const expected = envPassword(role);
  if (!expected) return false;
  return safeEq(password, expected);
}

export async function saveStaffPassword(
  role: StaffRole,
  password: string,
): Promise<void> {
  const hash = hashPassword(password);
  const sql = await getSql();
  if (role === "kitchen") {
    await sql`
      update shop_settings
      set kitchen_password_hash = ${hash}, updated_at = now()
      where id = 1
    `;
  } else {
    await sql`
      update shop_settings
      set manager_password_hash = ${hash}, updated_at = now()
      where id = 1
    `;
  }
}

export async function signStaffCookie(session: StaffSession): Promise<void> {
  const token = await new SignJWT({
    role: session.role,
    till: !!session.till,
    employeeId: session.employeeId || "",
    employeeName: session.employeeName || "",
    staffCode: session.staffCode || "",
    tillRole: session.tillRole || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(session.till ? "7d" : "12h")
    .sign(secretBytes());
  const secure =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: session.till ? TILL_MAX_AGE : MAX_AGE,
    secure,
  });
}

export function clearStaffCookie(): void {
  const secure =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  deleteCookie(COOKIE, { path: "/", secure });
}

export async function readStaffSession(): Promise<StaffSession | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretBytes());
    const role = payload.role;
    if (role !== "kitchen" && role !== "manager") return null;
    const employeeId =
      typeof payload.employeeId === "string" && payload.employeeId
        ? payload.employeeId
        : undefined;
    const employeeName =
      typeof payload.employeeName === "string" && payload.employeeName
        ? payload.employeeName
        : undefined;
    const staffCode =
      typeof payload.staffCode === "string" && payload.staffCode
        ? payload.staffCode
        : undefined;
    const till = payload.till === true;
    const tillRole = parseTillRole(payload.tillRole);
    return {
      role,
      till: till || undefined,
      employeeId,
      employeeName,
      staffCode,
      tillRole: employeeId ? tillRole : undefined,
    };
  } catch {
    return null;
  }
}

export async function readStaffRole(): Promise<StaffRole | null> {
  return (await readStaffSession())?.role ?? null;
}

export async function requireStaff(min: StaffRole): Promise<StaffRole> {
  const role = await readStaffRole();
  if (!role) throw new StaffAuthError();
  if (min === "manager" && role !== "manager") {
    throw new StaffAuthError("Back office sign-in required");
  }
  if (min === "kitchen" && role !== "kitchen" && role !== "manager") {
    throw new StaffAuthError();
  }
  return role;
}

export async function requireTillOperator(): Promise<StaffSession> {
  const s = await readStaffSession();
  if (!s?.employeeId) throw new StaffAuthError("Clock in on the till first.");
  const emp = await getEmployee(s.employeeId);
  if (!emp?.active) throw new StaffAuthError("Clock in on the till first.");
  const open = await getOpenShift(s.employeeId);
  if (!open) throw new StaffAuthError("Clock in on the till first.");
  return {
    role: "kitchen",
    till: true,
    employeeId: emp.id,
    employeeName: emp.name,
    staffCode: emp.staffCode,
    tillRole: emp.tillRole,
    clockInAt: open.clockIn,
  };
}

export async function requireTeamAdmin(): Promise<StaffSession> {
  const s = await readStaffSession();
  if (!s) throw new StaffAuthError();
  if (s.role === "manager") return s;
  if (s.tillRole === "manager" && s.employeeId) {
    const open = await getOpenShift(s.employeeId);
    if (open) return { ...s, till: true };
  }
  throw new StaffAuthError("Manager sign-in required");
}

const pinFails = new Map<string, { n: number; at: number }>();

function pinThrottled(): boolean {
  const now = Date.now();
  let n = 0;
  for (const [k, v] of pinFails) {
    if (now - v.at > PIN_FAIL_WINDOW_MS) pinFails.delete(k);
    else n += v.n;
  }
  return n >= PIN_FAIL_LIMIT;
}

function recordPinFail(): void {
  const slot = String(Math.floor(Date.now() / 30000));
  const prev = pinFails.get(slot);
  pinFails.set(slot, { n: (prev?.n ?? 0) + 1, at: Date.now() });
}

async function closeStaleShifts(employeeId?: string): Promise<void> {
  const sql = await getSql();
  if (employeeId) {
    await sql`
      update staff_shifts
      set clock_out = clock_in + interval '14 hours'
      where employee_id = ${employeeId}
        and clock_out is null
        and clock_in < now() - interval '14 hours'
    `;
    return;
  }
  await sql`
    update staff_shifts
    set clock_out = clock_in + interval '14 hours'
    where clock_out is null
      and clock_in < now() - interval '14 hours'
  `;
}

export async function getOpenShift(
  employeeId: string,
): Promise<{ id: string; clockIn: string } | null> {
  await closeStaleShifts(employeeId);
  const sql = await getSql();
  const rows = await sql<{ id: string; clock_in: string }>`
    select id, clock_in from staff_shifts
    where employee_id = ${employeeId} and clock_out is null
    limit 1
  `;
  const row = rows[0];
  return row ? { id: row.id, clockIn: iso(row.clock_in) } : null;
}

export async function clockIn(
  employeeId: string,
): Promise<{ id: string; clockIn: string }> {
  const open = await getOpenShift(employeeId);
  if (open) return open;
  const sql = await getSql();
  const id = crypto.randomUUID();
  try {
    const rows = await sql<{ id: string; clock_in: string }>`
      insert into staff_shifts (id, employee_id, clock_in)
      values (${id}, ${employeeId}, now())
      returning id, clock_in
    `;
    const row = rows[0]!;
    return { id: row.id, clockIn: iso(row.clock_in) };
  } catch {
    const again = await getOpenShift(employeeId);
    if (again) return again;
    throw new Error("Couldn't start the shift.");
  }
}

export async function clockOut(employeeId: string): Promise<void> {
  const sql = await getSql();
  await sql`
    update staff_shifts
    set clock_out = now()
    where employee_id = ${employeeId}
      and clock_out is null
  `;
}

type EmployeeRow = {
  id: string;
  name: string;
  staff_code: string;
  pin_hash: string;
  pin_key: string;
  active: boolean;
  job_role?: string;
};

export async function getEmployee(id: string): Promise<{
  id: string;
  name: string;
  staffCode: string;
  active: boolean;
  tillRole: TillRole;
} | null> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    name: string;
    staff_code: string;
    active: boolean;
    job_role: string;
  }>`
    select id, name, staff_code, active, job_role
    from staff_employees
    where id = ${id}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    staffCode: row.staff_code,
    active: !!row.active,
    tillRole: parseTillRole(row.job_role),
  };
}

function tillSession(
  emp: { id: string; name: string; staffCode: string; tillRole: TillRole },
  clockInAt: string,
): StaffSession {
  return {
    role: "kitchen",
    till: true,
    employeeId: emp.id,
    employeeName: emp.name,
    staffCode: emp.staffCode,
    tillRole: emp.tillRole,
    clockInAt,
  };
}

async function assertEmployeePin(
  employeeId: string,
  pin: string,
): Promise<EmployeeRow> {
  if (!pinOk(pin)) throw new Error("Use a 4-digit code.");
  if (pinThrottled()) {
    throw new Error("Too many tries — wait a minute.");
  }
  const sql = await getSql();
  const rows = await sql<EmployeeRow>`
    select id, name, staff_code, pin_hash, pin_key, active, job_role
    from staff_employees
    where id = ${employeeId} and active = true
    limit 1
  `;
  const row = rows[0];
  if (
    !row ||
    !safeEq(pinKey(pin), row.pin_key) ||
    !verifyHash(pin, row.pin_hash)
  ) {
    recordPinFail();
    throw new Error("That code didn't match.");
  }
  return row;
}

async function pinTaken(pin: string, exceptId?: string): Promise<boolean> {
  const sql = await getSql();
  const key = pinKey(pin);
  const rows = exceptId
    ? await sql<{ id: string }>`
        select id from staff_employees
        where pin_key = ${key} and active = true and id <> ${exceptId}
        limit 1
      `
    : await sql<{ id: string }>`
        select id from staff_employees
        where pin_key = ${key} and active = true
        limit 1
      `;
  return !!rows[0];
}

function formatStaffCode(n: number): string {
  return n < 100 ? String(n).padStart(2, "0") : String(n);
}

async function nextStaffCode(): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ staff_code: string }>`
    select staff_code from staff_employees
  `;
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.staff_code, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return formatStaffCode(max + 1);
}

export async function identifyTill(
  employeeId: string,
  pin: string,
): Promise<StaffSession> {
  const row = await assertEmployeePin(employeeId, pin);
  const shift = await clockIn(row.id);
  const session = tillSession(
    {
      id: row.id,
      name: row.name,
      staffCode: row.staff_code,
      tillRole: parseTillRole(row.job_role),
    },
    shift.clockIn,
  );
  await signStaffCookie(session);
  return session;
}

export async function loginWithPin(pin: string): Promise<StaffSession> {
  if (!pinOk(pin)) throw new Error("Use a 4-digit code.");
  if (pinThrottled()) {
    throw new Error("Too many tries — wait a minute.");
  }
  const sql = await getSql();
  const key = pinKey(pin);
  const rows = await sql<EmployeeRow>`
    select id, name, staff_code, pin_hash, pin_key, active, job_role
    from staff_employees
    where pin_key = ${key} and active = true
    limit 1
  `;
  const row = rows[0];
  if (!row || !verifyHash(pin, row.pin_hash)) {
    recordPinFail();
    throw new Error("That code didn't match.");
  }
  return identifyTill(row.id, pin);
}

function money(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

async function shiftTotals(
  employeeId: string,
  name: string,
  staffCode: string,
  clockInAt: string,
  clockOutAt: string,
): Promise<ShiftTotals> {
  const sql = await getSql();
  const stats = await sql<{ n: number; takings: unknown }>`
    select count(*)::int as n, coalesce(sum(amount_total), 0) as takings
    from orders
    where taken_by = ${employeeId}
      and created_at >= ${clockInAt}
      and created_at <= ${clockOutAt}
      and coalesce(voided, false) = false
  `;
  return {
    employeeId,
    employeeName: name,
    staffCode,
    clockIn: clockInAt,
    clockOut: clockOutAt,
    hours: shiftHours(clockInAt, clockOutAt),
    tickets: Number(stats[0]?.n ?? 0),
    takings: money(stats[0]?.takings),
  };
}

export async function previewClockOut(pin: string): Promise<ShiftTotals> {
  const s = await requireTillOperator();
  await assertEmployeePin(s.employeeId!, pin);
  const open = await getOpenShift(s.employeeId!);
  if (!open) throw new Error("You are not on shift.");
  return shiftTotals(
    s.employeeId!,
    s.employeeName || "Staff",
    s.staffCode || "",
    open.clockIn,
    new Date().toISOString(),
  );
}

export async function clockOutCurrent(pin: string): Promise<ShiftTotals> {
  const s = await requireTillOperator();
  await assertEmployeePin(s.employeeId!, pin);
  const employeeId = s.employeeId!;
  const open = await getOpenShift(employeeId);
  if (!open) throw new Error("You are not on shift.");
  const sql = await getSql();
  const out = await sql<{ clock_out: string }>`
    update staff_shifts
    set clock_out = now()
    where employee_id = ${employeeId}
      and clock_out is null
    returning clock_out
  `;
  const clockOutAt = iso(out[0]?.clock_out || new Date());
  const totals = await shiftTotals(
    employeeId,
    s.employeeName || "Staff",
    s.staffCode || "",
    open.clockIn,
    clockOutAt,
  );
  await signStaffCookie({ role: "kitchen", till: true });
  return totals;
}

export async function forceClockOutEmployee(
  targetId: string,
  pin: string,
): Promise<void> {
  const actor = await requireTillOperator();
  if (!canForceClockOut(actor.tillRole)) {
    throw new Error("A manager has to do that.");
  }
  if (targetId === actor.employeeId) {
    throw new Error("Use Clock out for your own shift.");
  }
  await assertEmployeePin(actor.employeeId!, pin);
  const target = await getEmployee(targetId);
  if (!target) throw new Error("No one with that name.");
  await clockOut(targetId);
}

export async function listTillRoster(): Promise<TillPerson[]> {
  await closeStaleShifts();
  const sql = await getSql();
  const people = await sql<{
    id: string;
    name: string;
    staff_code: string;
    job_role: string;
  }>`
    select id, name, staff_code, job_role
    from staff_employees
    where active = true
    order by name asc, staff_code asc
  `;
  const openRows = await sql<{
    employee_id: string;
    clock_in: string;
  }>`
    select employee_id, clock_in from staff_shifts where clock_out is null
  `;
  const openBy = new Map(openRows.map((r) => [r.employee_id, iso(r.clock_in)]));
  return people.map((p) => {
    const clockInAt = openBy.get(p.id) ?? null;
    return {
      id: p.id,
      staffCode: p.staff_code,
      name: p.name,
      tillRole: parseTillRole(p.job_role),
      onShift: !!clockInAt,
      clockInAt,
    };
  });
}

export async function createEmployee(
  name: string,
  pin: string,
  tillRole: TillRole = "cashier",
): Promise<StaffEmployee> {
  const n = name.trim().slice(0, 40);
  if (n.length < 2) throw new Error("Need a name.");
  if (!pinOk(pin)) throw new Error("Codes are 4 digits.");
  const role = parseTillRole(tillRole);
  if (await pinTaken(pin)) throw new Error("That code is already in use.");
  const id = crypto.randomUUID();
  let code = await nextStaffCode();
  const sql = await getSql();
  try {
    await sql`
      insert into staff_employees
        (id, name, pin_hash, pin_key, active, job_role, staff_code)
      values
        (${id}, ${n}, ${hashPassword(pin)}, ${pinKey(pin)}, true, ${role}, ${code})
    `;
  } catch {
    code = await nextStaffCode();
    await sql`
      insert into staff_employees
        (id, name, pin_hash, pin_key, active, job_role, staff_code)
      values
        (${id}, ${n}, ${hashPassword(pin)}, ${pinKey(pin)}, true, ${role}, ${code})
    `;
  }
  return {
    id,
    staffCode: code,
    name: n,
    active: true,
    onShift: false,
    clockInAt: null,
    hoursInRange: 0,
    shiftCount: 0,
    tillRole: role,
  };
}

export async function setEmployeePin(id: string, pin: string): Promise<void> {
  if (!pinOk(pin)) throw new Error("Codes are 4 digits.");
  if (await pinTaken(pin, id)) throw new Error("That code is already in use.");
  const sql = await getSql();
  const updated = await sql<{ id: string }>`
    update staff_employees
    set pin_hash = ${hashPassword(pin)}, pin_key = ${pinKey(pin)}
    where id = ${id}
    returning id
  `;
  if (!updated[0]) throw new Error("No one with that name.");
}

export async function setEmployeeRole(
  id: string,
  tillRole: TillRole,
): Promise<void> {
  const role = parseTillRole(tillRole);
  const sql = await getSql();
  const updated = await sql<{ id: string }>`
    update staff_employees set job_role = ${role} where id = ${id} returning id
  `;
  if (!updated[0]) throw new Error("No one with that name.");
}

export async function setEmployeeActive(
  id: string,
  active: boolean,
): Promise<void> {
  const sql = await getSql();
  if (!active) await clockOut(id);
  if (active) {
    const row = await sql<{ pin_key: string }>`
      select pin_key from staff_employees where id = ${id} limit 1
    `;
    const key = row[0]?.pin_key;
    if (key) {
      const clash = await sql<{ id: string }>`
        select id from staff_employees
        where pin_key = ${key} and active = true and id <> ${id}
        limit 1
      `;
      if (clash[0]) {
        throw new Error("That code is already in use. Set a new code first.");
      }
    }
  }
  const updated = await sql<{ id: string }>`
    update staff_employees set active = ${active} where id = ${id} returning id
  `;
  if (!updated[0]) throw new Error("No one with that name.");
}

export async function renameEmployee(id: string, name: string): Promise<void> {
  const n = name.trim().slice(0, 40);
  if (n.length < 2) throw new Error("Need a name.");
  const sql = await getSql();
  const updated = await sql<{ id: string }>`
    update staff_employees set name = ${n} where id = ${id} returning id
  `;
  if (!updated[0]) throw new Error("No one with that name.");
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? "");
}

function ymd(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Bad date.");
  return s;
}

export async function listTeam(fromYmd: string, toYmd: string): Promise<{
  employees: StaffEmployee[];
  shifts: StaffShift[];
}> {
  const from = ymd(fromYmd);
  const to = ymd(toYmd);
  await closeStaleShifts();
  const sql = await getSql();
  const people = await sql<{
    id: string;
    name: string;
    staff_code: string;
    active: boolean;
    job_role: string;
  }>`
    select id, name, staff_code, active, job_role
    from staff_employees
    order by active desc, name asc, staff_code asc
  `;
  const shiftRows = await sql<{
    id: string;
    employee_id: string;
    name: string;
    staff_code: string;
    clock_in: string;
    clock_out: string | null;
  }>`
    select s.id, s.employee_id, e.name, e.staff_code, s.clock_in, s.clock_out
    from staff_shifts s
    join staff_employees e on e.id = s.employee_id
    where s.clock_in >= (${from}::timestamp AT TIME ZONE 'Europe/London')
      and s.clock_in < (${to}::timestamp AT TIME ZONE 'Europe/London')
    order by e.name asc, s.clock_in desc
  `;
  const openRows = await sql<{
    employee_id: string;
    clock_in: string;
  }>`
    select employee_id, clock_in from staff_shifts where clock_out is null
  `;
  const openBy = new Map(openRows.map((r) => [r.employee_id, iso(r.clock_in)]));
  const shifts: StaffShift[] = shiftRows.map((r) => {
    const clockIn = iso(r.clock_in);
    const clockOut = r.clock_out ? iso(r.clock_out) : null;
    return {
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.name,
      staffCode: r.staff_code,
      clockIn,
      clockOut,
      hours: shiftHours(clockIn, clockOut),
      open: !clockOut,
    };
  });
  const hoursBy = new Map<string, { hours: number; n: number }>();
  for (const s of shifts) {
    const prev = hoursBy.get(s.employeeId) ?? { hours: 0, n: 0 };
    prev.hours += s.hours;
    prev.n += 1;
    hoursBy.set(s.employeeId, prev);
  }
  const employees: StaffEmployee[] = people.map((p) => {
    const agg = hoursBy.get(p.id) ?? { hours: 0, n: 0 };
    const clockInAt = openBy.get(p.id) ?? null;
    return {
      id: p.id,
      staffCode: p.staff_code,
      name: p.name,
      active: !!p.active,
      onShift: !!clockInAt,
      clockInAt,
      hoursInRange: Math.round(agg.hours * 100) / 100,
      shiftCount: agg.n,
      tillRole: parseTillRole(p.job_role),
    };
  });
  return { employees, shifts };
}
