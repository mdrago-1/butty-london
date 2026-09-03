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
  pinOk,
  shiftHours,
  type StaffEmployee,
  type StaffRole,
  type StaffSession,
  type StaffShift,
} from "@/lib/staff";

export type { StaffRole, StaffSession };

const COOKIE = "butty_staff";
const MAX_AGE = 60 * 60 * 12;
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
    employeeId: session.employeeId || "",
    employeeName: session.employeeName || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretBytes());
  const secure =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
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
    return { role, employeeId, employeeName };
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
  return row ? { id: row.id, clockIn: String(row.clock_in) } : null;
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
    return { id: row.id, clockIn: String(row.clock_in) };
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
  pin_hash: string;
  pin_key: string;
  active: boolean;
};

export async function loginWithPin(pin: string): Promise<StaffSession> {
  if (!pinOk(pin)) throw new Error("Use a 4–6 digit code.");
  if (pinThrottled()) {
    throw new Error("Too many tries — wait a minute.");
  }
  const sql = await getSql();
  const key = pinKey(pin);
  const rows = await sql<EmployeeRow>`
    select id, name, pin_hash, pin_key, active
    from staff_employees
    where pin_key = ${key} and active = true
    limit 1
  `;
  const row = rows[0];
  if (!row || !verifyHash(pin, row.pin_hash)) {
    recordPinFail();
    throw new Error("That code didn't match.");
  }
  const shift = await clockIn(row.id);
  const session: StaffSession = {
    role: "kitchen",
    employeeId: row.id,
    employeeName: row.name,
    clockInAt: shift.clockIn,
  };
  await signStaffCookie(session);
  return session;
}

export async function createEmployee(name: string, pin: string): Promise<StaffEmployee> {
  const n = name.trim().slice(0, 40);
  if (n.length < 2) throw new Error("Need a name.");
  if (!pinOk(pin)) throw new Error("Codes are 4–6 digits.");
  const sql = await getSql();
  const key = pinKey(pin);
  const taken = await sql<{ id: string }>`
    select id from staff_employees where pin_key = ${key} and active = true limit 1
  `;
  if (taken[0]) throw new Error("That code is already in use.");
  const id = crypto.randomUUID();
  await sql`
    insert into staff_employees (id, name, pin_hash, pin_key, active)
    values (${id}, ${n}, ${hashPassword(pin)}, ${key}, true)
  `;
  return {
    id,
    name: n,
    active: true,
    onShift: false,
    clockInAt: null,
    hoursInRange: 0,
    shiftCount: 0,
  };
}

export async function setEmployeePin(id: string, pin: string): Promise<void> {
  if (!pinOk(pin)) throw new Error("Codes are 4–6 digits.");
  const sql = await getSql();
  const key = pinKey(pin);
  const taken = await sql<{ id: string }>`
    select id from staff_employees
    where pin_key = ${key} and active = true and id <> ${id}
    limit 1
  `;
  if (taken[0]) throw new Error("That code is already in use.");
  const updated = await sql<{ id: string }>`
    update staff_employees
    set pin_hash = ${hashPassword(pin)}, pin_key = ${key}
    where id = ${id}
    returning id
  `;
  if (!updated[0]) throw new Error("No one with that name.");
}

export async function setEmployeeActive(
  id: string,
  active: boolean,
): Promise<void> {
  const sql = await getSql();
  if (!active) await clockOut(id);
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
    active: boolean;
  }>`
    select id, name, active
    from staff_employees
    order by active desc, name asc
  `;
  const shiftRows = await sql<{
    id: string;
    employee_id: string;
    name: string;
    clock_in: string;
    clock_out: string | null;
  }>`
    select s.id, s.employee_id, e.name, s.clock_in, s.clock_out
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
      name: p.name,
      active: !!p.active,
      onShift: !!clockInAt,
      clockInAt,
      hoursInRange: Math.round(agg.hours * 100) / 100,
      shiftCount: agg.n,
    };
  });
  return { employees, shifts };
}
