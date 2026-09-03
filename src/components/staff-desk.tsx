import { useEffect, useMemo, useState } from "react";
import { Clock, Download, Plus, User } from "lucide-react";
import { inpStyle } from "@/components/bits";
import { cn } from "@/lib/cn";
import {
  addStaffEmployee,
  clockOutStaffEmployee,
  listStaffTeam,
  setStaffEmployeeActive,
  setStaffEmployeePin,
  setStaffEmployeeRole,
} from "@/lib/staff-api";
import {
  fmtLondonDate,
  fmtLondonTime,
  hoursRange,
  pinOk,
  shiftsToCsv,
  tillRoleLabel,
  type HoursRange,
  type StaffEmployee,
  type StaffShift,
  type TillRole,
} from "@/lib/staff";

type RangeKind = "week" | "lastWeek" | "month";

export function StaffDesk() {
  const [kind, setKind] = useState<RangeKind>("week");
  const range = useMemo(() => hoursRange(kind), [kind]);
  const [employees, setEmployees] = useState<StaffEmployee[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (r: HoursRange) => {
    setError(null);
    try {
      const data = await listStaffTeam({
        data: { from: r.from, to: r.to, range: kind },
      });
      setEmployees(data.employees);
      setShifts(data.shifts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the team.");
    }
  };

  useEffect(() => {
    void load(range);
  }, [kind]);

  const exportCsv = () => {
    const csv = shiftsToCsv(shifts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `butty-hours-${range.from}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <p className="mt-0 mb-3 text-sm text-butty-muted">
        Each person gets a 4-digit till code. They pick their name on the till,
        enter the code, and land on today's roster. Clock out on the till ends
        that person's shift — hours land here.
      </p>

      <AddEmployee
        onAdded={() => void load(range)}
        onError={setError}
      />

      <div className="mt-4 mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["week", "This week"],
            ["lastWeek", "Last week"],
            ["month", "This month"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={cn(
              "rounded-full border-2 border-butty-ink px-3 py-1.5 text-sm font-bold",
              kind === id
                ? "bg-butty-ink text-butty-cream"
                : "bg-butty-paper text-butty-ink",
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={exportCsv}
          disabled={shifts.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 py-1.5 text-sm font-bold disabled:opacity-40"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error && (
        <p className="mt-0 mb-3 text-sm font-semibold text-butty-red">{error}</p>
      )}

      {employees.length === 0 ? (
        <div className="rounded-[14px] border-2 border-dashed border-butty-ink bg-butty-paper px-6 py-8 text-center text-sm text-butty-muted">
          Add the first person above. They’ll use that code on the till.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border-2 border-butty-ink bg-butty-paper">
          {employees.map((e, i) => (
            <EmployeeRow
              key={e.id}
              employee={e}
              shifts={shifts.filter((s) => s.employeeId === e.id)}
              open={openId === e.id}
              onToggle={() => setOpenId((id) => (id === e.id ? null : e.id))}
              first={i === 0}
              busy={busy}
              onRefresh={() => void load(range)}
              setBusy={setBusy}
              setError={setError}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AddEmployee({
  onAdded,
  onError,
}: {
  onAdded: () => void;
  onError: (m: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [tillRole, setTillRole] = useState<TillRole>("cashier");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    onError(null);
    if (name.trim().length < 2) {
      onError("Need a name.");
      return;
    }
    if (!pinOk(pin)) {
      onError("Codes are 4 digits.");
      return;
    }
    setBusy(true);
    try {
      await addStaffEmployee({
        data: { name: name.trim(), pin, tillRole },
      });
      setName("");
      setPin("");
      setTillRole("cashier");
      onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't add them.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2 rounded-[14px] border-2 border-butty-ink bg-butty-paper p-3 sm:grid-cols-[1fr_7rem_9rem_auto]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        style={inpStyle}
      />
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="Code"
        inputMode="numeric"
        autoComplete="off"
        style={inpStyle}
      />
      <select
        value={tillRole}
        onChange={(e) => setTillRole(e.target.value as TillRole)}
        className="h-11 rounded-[10px] border-2 border-butty-ink bg-butty-paper px-2 text-sm font-bold"
      >
        <option value="cashier">Cashier</option>
        <option value="shift_lead">Shift lead</option>
        <option value="manager">Manager</option>
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 text-sm font-bold"
      >
        <Plus size={16} /> Add
      </button>
    </div>
  );
}

function EmployeeRow({
  employee: e,
  shifts,
  open,
  onToggle,
  first,
  busy,
  onRefresh,
  setBusy,
  setError,
}: {
  employee: StaffEmployee;
  shifts: StaffShift[];
  open: boolean;
  onToggle: () => void;
  first: boolean;
  busy: boolean;
  onRefresh: () => void;
  setBusy: (v: boolean) => void;
  setError: (m: string | null) => void;
}) {
  const [pin, setPin] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(!first && "border-t-2 border-butty-ink")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <User size={16} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">
            {e.name}
            <span className="ml-1.5 font-semibold text-butty-muted">
              · {tillRoleLabel(e.tillRole)}
            </span>
            {!e.active && (
              <span className="ml-1.5 font-semibold text-butty-muted">
                · off the till
              </span>
            )}
          </div>
          <div className="text-xs text-butty-muted">
            {e.hoursInRange.toFixed(2)} hrs
            {e.onShift && e.clockInAt
              ? ` · on since ${fmtLondonTime(e.clockInAt)}`
              : ""}
          </div>
        </div>
        {e.onShift && (
          <span className="rounded-full bg-butty-green px-2 py-0.5 text-[10px] font-bold tracking-wide text-butty-cream uppercase">
            On shift
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-butty-line bg-butty-cream px-3 py-3">
          {shifts.length === 0 ? (
            <p className="mt-0 mb-3 text-sm text-butty-muted">
              No shifts in this period.
            </p>
          ) : (
            <div className="mb-3 grid gap-1.5">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Clock size={13} className="shrink-0 text-butty-muted" />
                  <span className="min-w-0 flex-1 font-semibold">
                    {fmtLondonDate(s.clockIn)} · {fmtLondonTime(s.clockIn)}
                    {" – "}
                    {s.clockOut ? fmtLondonTime(s.clockOut) : "now"}
                  </span>
                  <span className="tabular-nums font-bold">
                    {s.hours.toFixed(2)}h
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {e.onShift && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    clockOutStaffEmployee({ data: { id: e.id } }),
                  )
                }
                className="rounded-[10px] border-2 border-butty-ink bg-butty-paper px-3 py-2 text-xs font-bold"
              >
                Clock out
              </button>
            )}
            {e.active && (
              <select
                value={e.tillRole}
                disabled={busy}
                onChange={(ev) =>
                  void run(() =>
                    setStaffEmployeeRole({
                      data: {
                        id: e.id,
                        tillRole: ev.target.value as TillRole,
                      },
                    }),
                  )
                }
                className="h-9 rounded-[10px] border-2 border-butty-ink bg-butty-paper px-2 text-xs font-bold"
              >
                <option value="cashier">Cashier</option>
                <option value="shift_lead">Shift lead</option>
                <option value="manager">Manager</option>
              </select>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  setStaffEmployeeActive({
                    data: { id: e.id, active: !e.active },
                  }),
                )
              }
              className="rounded-[10px] border-2 border-butty-ink bg-butty-paper px-3 py-2 text-xs font-bold"
            >
              {e.active ? "Take off till" : "Put back on till"}
            </button>
          </div>
          {e.active && (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!pinOk(pin)) {
                  setError("Codes are 4 digits.");
                  return;
                }
                void run(async () => {
                  await setStaffEmployeePin({ data: { id: e.id, pin } });
                  setPin("");
                });
              }}
            >
              <input
                value={pin}
                onChange={(ev) =>
                  setPin(ev.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="New code"
                inputMode="numeric"
                autoComplete="off"
                style={{ ...inpStyle, padding: "8px 10px" }}
              />
              <button
                type="submit"
                disabled={busy || pin.length < 4}
                className="shrink-0 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 text-xs font-bold"
              >
                Set code
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
