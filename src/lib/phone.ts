/** Store UK mobiles as 44XXXXXXXXXX. Empty string if it isn't a number. */
export function normalizePhone(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("44") && d.length >= 12) return d.slice(0, 13);
  if (d.startsWith("0") && d.length === 11) return `44${d.slice(1)}`;
  if (d.length === 10) return `44${d}`;
  if (d.length >= 11) return d.slice(0, 13);
  return d;
}

export function displayPhone(stored: string): string {
  const n = normalizePhone(stored);
  if (!n) return "";
  if (n.startsWith("44") && n.length === 12) {
    const local = `0${n.slice(2)}`;
    return `${local.slice(0, 5)} ${local.slice(5, 8)} ${local.slice(8)}`;
  }
  return stored;
}

export function phoneDigits(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}
