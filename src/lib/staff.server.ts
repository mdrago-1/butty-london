import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import type { StaffRole } from "@/lib/staff";

export type { StaffRole };

const COOKIE = "butty_staff";
const MAX_AGE = 60 * 60 * 12;

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

export async function signStaffCookie(role: StaffRole): Promise<void> {
  const token = await new SignJWT({ role })
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

export async function readStaffRole(): Promise<StaffRole | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretBytes());
    const role = payload.role;
    if (role === "kitchen" || role === "manager") return role;
    return null;
  } catch {
    return null;
  }
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
