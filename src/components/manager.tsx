import { useState } from "react";
import {
  Clock,
  Edit3,
  HardHat,
  Leaf,
  Plus,
  Settings,
  Star,
  Store,
  Trash2,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Chip, Field, inpStyle, ScreenHead } from "@/components/bits";
import { ClubDesk } from "@/components/club-desk";
import { StaffDesk } from "@/components/staff-desk";
import { StaffPasswords } from "@/components/staff-passwords";
import { cn } from "@/lib/cn";
import { fmtHour, hourOpts } from "@/lib/format";
import { ALLERGENS, CLOSE, SECTION_ORDER } from "@/lib/menu";
import { useShop } from "@/lib/store";
import type { Extra, MenuItem } from "@/lib/types";

type OfficeTab = "menu" | "loyalty" | "staff" | "shop";

const TABS: [OfficeTab, string, LucideIcon][] = [
  ["menu", "Menu", UtensilsCrossed],
  ["loyalty", "Loyalty", Star],
  ["staff", "Staff", Users],
  ["shop", "Shop", Settings],
];

export function Manager() {
  const menu = useShop((s) => s.menu);
  const shopOpen = useShop((s) => s.shopOpen);
  const renovating = useShop((s) => s.renovating);
  const specialsPaused = useShop((s) => s.specialsPaused);
  const setShopOpen = useShop((s) => s.setShopOpen);
  const setRenovating = useShop((s) => s.setRenovating);
  const setSpecialsPaused = useShop((s) => s.setSpecialsPaused);
  const upsertItem = useShop((s) => s.upsertItem);
  const deleteItem = useShop((s) => s.deleteItem);
  const toggleSold = useShop((s) => s.toggleSold);

  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [tab, setTab] = useState<OfficeTab>("menu");

  const saveItem = (item: MenuItem) => {
    upsertItem(item);
    setEditing(null);
  };

  const grouped = SECTION_ORDER.map((s) => ({
    name: s,
    items: menu.filter((i) => i.section === s),
  })).filter((g) => g.items.length);

  if (editing) {
    return (
      <ItemEditor
        item={editing === "new" ? null : editing}
        onSave={saveItem}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-[760px] px-4 py-5 pb-10">
      <div className="mb-4 flex items-center gap-2.5">
        <Settings size={22} />
        <h1 className="m-0 font-display text-[22px]">Back office</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border-2 border-butty-ink px-3.5 py-2 text-sm font-bold",
              tab === id
                ? "bg-butty-ink text-butty-cream"
                : "bg-butty-paper text-butty-ink",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "loyalty" && <ClubDesk />}

      {tab === "staff" && <StaffDesk />}

      {tab === "shop" && (
        <>
          <a
            href="/counter"
            className="mb-4 flex items-center justify-between rounded-[14px] border-2 border-butty-ink bg-butty-paper px-4 py-3.5 text-inherit no-underline"
          >
            <div>
              <div className="font-bold">Counter till</div>
              <div className="text-sm text-butty-muted">
                Walk-in orders — staff sign in with their own code
              </div>
            </div>
            <span className="text-sm font-bold">Open →</span>
          </a>
          <div className="mb-[22px] grid gap-2.5">
            <ToggleRow
              icon={HardHat}
              label="Renovations"
              on={!renovating}
              onLabel="Open to the public"
              offLabel="Opening soon"
              toggle={() => setRenovating(!renovating)}
            />
            <ToggleRow
              icon={Store}
              label="Shop online orders"
              on={shopOpen}
              onLabel="Taking orders"
              offLabel="Paused — counter only"
              toggle={() => setShopOpen(!shopOpen)}
            />
            <ToggleRow
              icon={Clock}
              label="Lunch specials"
              on={!specialsPaused}
              onLabel="Available 11–2"
              offLabel="Paused (e.g. sold out of beef)"
              toggle={() => setSpecialsPaused(!specialsPaused)}
            />
          </div>
          <StaffPasswords />
        </>
      )}

      {tab === "menu" && (
        <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="m-0 font-display text-base">Menu</h2>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-xl bg-butty-red px-3.5 py-[9px] text-[13.5px] font-bold text-butty-cream shadow-[0_4px_0_var(--color-butty-red-deep)]"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {grouped.map((g) => (
        <div key={g.name} className="mb-[18px]">
          <div className="mb-2 text-xs font-bold tracking-widest text-butty-muted uppercase">
            {g.name}
          </div>
          <div className="grid gap-2">
            {g.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-2.5 rounded-xl border-2 border-butty-ink bg-butty-paper px-[13px] py-[11px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-bold">
                    {it.name}
                    {it.veg && (
                      <Leaf size={13} className="text-butty-green" />
                    )}
                    {it.soldOut && (
                      <span className="rounded-full bg-butty-ink px-[7px] py-px text-[10.5px] text-butty-cream">
                        Sold out
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-butty-muted">
                    £{it.price.toFixed(2)} · {fmtHour(it.from)}–
                    {fmtHour(it.to)}
                    {it.allergens.length ? ` · ${it.allergens.join(", ")}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSold(it.id)}
                  title="Toggle sold out"
                  className={cn(
                    "rounded-lg border-2 border-butty-ink px-[9px] py-[7px] text-[11.5px] font-bold",
                    it.soldOut
                      ? "bg-butty-ink text-butty-cream"
                      : "bg-butty-cream text-butty-ink",
                  )}
                >
                  {it.soldOut ? "Sold out" : "In stock"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(it)}
                  aria-label={`Edit ${it.name}`}
                  className="grid size-[34px] place-items-center rounded-lg border-2 border-butty-ink bg-butty-cream text-butty-ink"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(it.id)}
                  aria-label={`Delete ${it.name}`}
                  className="grid size-[34px] place-items-center rounded-lg border-2 border-butty-ink bg-butty-cream text-butty-red"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  on,
  onLabel,
  offLabel,
  toggle,
}: {
  icon: typeof Store;
  label: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  toggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[14px] border-2 border-butty-ink px-3.5 py-3",
        on ? "bg-butty-paper" : "bg-butty-pause",
      )}
    >
      <Icon size={20} className={on ? "text-butty-green" : "text-butty-red"} />
      <div className="flex-1">
        <div className="text-[14.5px] font-bold">{label}</div>
        <div className="text-[12.5px] text-butty-muted">
          {on ? onLabel : offLabel}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={cn(
          "relative h-[30px] w-[54px] rounded-full border-2 border-butty-ink p-0",
          on ? "bg-butty-green" : "bg-butty-disabled",
        )}
      >
        <span
          className="absolute top-0.5 size-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200"
          style={{ left: on ? 26 : 2 }}
        />
      </button>
    </div>
  );
}

function ItemEditor({
  item,
  onSave,
  onCancel,
}: {
  item: MenuItem | null;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<MenuItem>(
    item || {
      id: "n" + Date.now(),
      section: SECTION_ORDER[1],
      name: "",
      desc: "",
      price: 5.0,
      from: 8,
      to: CLOSE,
      soldOut: false,
      veg: false,
      allergens: [],
      remove: [],
      extras: [],
    },
  );
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const toggleAllergen = (a: string) =>
    set(
      "allergens",
      f.allergens.includes(a)
        ? f.allergens.filter((x) => x !== a)
        : [...f.allergens, a],
    );
  const valid = f.name.trim().length > 0 && f.price >= 0;

  const [removeStr, setRemoveStr] = useState((item?.remove || []).join(", "));
  const [extrasStr, setExtrasStr] = useState(
    (item?.extras || [])
      .map((e) => `${e.n} £${e.p.toFixed(2)}`)
      .join("\n"),
  );

  const commit = () => {
    const remove = removeStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const extras: Extra[] = extrasStr.split("\n").flatMap((line) => {
      const m = line.match(/^(.*?)\s*£?([\d.]+)\s*$/);
      if (!m || !m[1].trim()) return [];
      return [{ n: m[1].trim(), p: parseFloat(m[2]) || 0 }];
    });
    onSave({
      ...f,
      price: parseFloat(String(f.price)) || 0,
      from: parseFloat(String(f.from)),
      to: parseFloat(String(f.to)),
      remove,
      extras,
    });
  };

  return (
    <div className="mx-auto max-w-[620px] px-4 py-5 pb-10">
      <ScreenHead
        title={item ? "Edit item" : "New item"}
        onBack={onCancel}
      />
      <div className="mt-4 grid gap-3.5">
        <Field label="Name">
          <input
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            style={inpStyle}
            placeholder="e.g. Pulled Beef Sub"
          />
        </Field>
        <Field label="Description">
          <input
            value={f.desc}
            onChange={(e) => set("desc", e.target.value)}
            style={inpStyle}
            placeholder="What's in it"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Price (£)" className="flex-1">
            <input
              type="number"
              step="0.10"
              value={f.price}
              onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
              style={inpStyle}
            />
          </Field>
          <Field label="Section" className="flex-[2]">
            <select
              value={f.section}
              onChange={(e) => set("section", e.target.value)}
              style={inpStyle}
            >
              {SECTION_ORDER.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex gap-3">
          <Field label="Available from" className="flex-1">
            <select
              value={f.from}
              onChange={(e) => set("from", parseFloat(e.target.value))}
              style={inpStyle}
            >
              {hourOpts().map((h) => (
                <option key={h} value={h}>
                  {fmtHour(h)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Available until" className="flex-1">
            <select
              value={f.to}
              onChange={(e) => set("to", parseFloat(e.target.value))}
              style={inpStyle}
            >
              {hourOpts().map((h) => (
                <option key={h} value={h}>
                  {fmtHour(h)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Removable ingredients (comma separated)">
          <input
            value={removeStr}
            onChange={(e) => setRemoveStr(e.target.value)}
            style={inpStyle}
            placeholder="Cheese, Onion, Mayo"
          />
        </Field>
        <Field label="Extras — one per line, name then price">
          <textarea
            value={extrasStr}
            onChange={(e) => setExtrasStr(e.target.value)}
            rows={3}
            style={{ ...inpStyle, resize: "vertical" }}
            placeholder={"Extra bacon £1.20\nAvocado £1.50"}
          />
        </Field>
        <Field label="Allergens">
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <Chip
                key={a}
                on={f.allergens.includes(a)}
                onClick={() => toggleAllergen(a)}
              >
                {a}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-[14.5px] font-semibold">
            <input
              type="checkbox"
              checked={f.veg}
              onChange={(e) => set("veg", e.target.checked)}
              className="size-[18px]"
            />
            <Leaf size={15} className="text-butty-green" /> Vegetarian
          </label>
          <label className="flex items-center gap-2 text-[14.5px] font-semibold">
            <input
              type="checkbox"
              checked={f.soldOut}
              onChange={(e) => set("soldOut", e.target.checked)}
              className="size-[18px]"
            />
            Sold out
          </label>
        </div>
        <div className="mt-2 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[14px] border-2 border-butty-ink bg-butty-paper py-[15px] font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={commit}
            className={cn(
              "flex-[2] rounded-[14px] py-[15px] text-[15px] font-bold text-butty-cream",
              valid
                ? "bg-butty-red shadow-[0_5px_0_var(--color-butty-red-deep)]"
                : "bg-butty-disabled",
            )}
          >
            {item ? "Save changes" : "Add to menu"}
          </button>
        </div>
      </div>
    </div>
  );
}
