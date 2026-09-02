const CLOSE = 17;

export function fmtHour(h: number | string): string {
  const n = parseFloat(String(h));
  const hr = Math.floor(n);
  const m = Math.round((n - hr) * 60);
  const ampm = hr >= 12 ? "pm" : "am";
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}

/** Current decimal hour in Europe/London (e.g. 16.5 for 4:30pm). */
export function londonHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

export function hourOpts(): number[] {
  const o: number[] = [];
  for (let h = 6; h <= 20; h += 0.5) o.push(h);
  return o;
}

export function fmtDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${time}`;
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    `, ${time}`
  );
}

export function buildSlots(hour: number): { value: string; label: string }[] {
  const out = [{ value: "asap", label: "ASAP (~15 min)" }];
  let start = Math.ceil((hour + 0.25) * 4) / 4;
  for (let i = 0; i < 4 && start < CLOSE; i++) {
    out.push({ value: fmtHour(start), label: fmtHour(start) });
    start += 0.25;
  }
  return out;
}
