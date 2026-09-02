import { useEffect, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { inpStyle } from "@/components/bits";
import { cn } from "@/lib/cn";
import { STAMPS_FOR_REWARD } from "@/lib/loyalty";
import { adjustClubStamps, listClubMembers } from "@/lib/loyalty-api";
import type { ClubMember } from "@/lib/loyalty";

export function ClubDesk() {
  const [q, setQ] = useState("");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (query: string) => {
    setError(null);
    try {
      const rows = await listClubMembers({ data: { q: query } });
      setMembers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the club.");
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const adjust = async (userId: string, delta: number) => {
    setBusyId(userId);
    setError(null);
    try {
      const next = await adjustClubStamps({ data: { userId, delta } });
      setMembers((list) => list.map((m) => (m.userId === userId ? next : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't adjust stamps.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <p className="mt-0 mb-3 text-sm text-butty-muted">
        Buy 9 sandwiches, get the 10th free. Tap + or − to adjust a card.
      </p>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-butty-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email"
            style={{ ...inpStyle, paddingLeft: 34 }}
          />
        </div>
        <button
          type="submit"
          className="rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 text-sm font-bold"
        >
          Find
        </button>
      </form>
      {error && (
        <p className="mt-0 mb-3 text-sm font-semibold text-butty-red">{error}</p>
      )}
      {members.length === 0 ? (
        <div className="rounded-[14px] border-2 border-dashed border-butty-ink bg-butty-paper px-6 py-8 text-center text-sm text-butty-muted">
          No club members yet. They appear here when someone signs in on the
          customer app.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border-2 border-butty-ink bg-butty-paper">
          {members.map((m, i) => (
            <div
              key={m.userId}
              className={cn(
                "flex items-center gap-2 px-3 py-2",
                i > 0 && "border-t-2 border-butty-ink",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold leading-tight">
                  {m.displayName}
                  {m.canRedeem && (
                    <span className="ml-1.5 rounded-full bg-butty-red px-1.5 py-px text-[10px] font-bold tracking-wide text-butty-cream uppercase">
                      Free
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-butty-muted">
                  {m.email || "No email"}
                </div>
              </div>
              <div
                className={cn(
                  "shrink-0 rounded-full border-2 border-butty-ink px-2 py-0.5 text-xs font-bold tabular-nums",
                  m.canRedeem
                    ? "bg-butty-yellow text-butty-ink"
                    : "bg-butty-cream text-butty-ink",
                )}
              >
                {m.card}/{STAMPS_FOR_REWARD}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busyId === m.userId || m.stamps <= 0}
                  onClick={() => void adjust(m.userId, -1)}
                  aria-label={`Remove a stamp from ${m.displayName}`}
                  className={cn(
                    "grid size-10 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-cream",
                    m.stamps <= 0 && "opacity-40",
                  )}
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  disabled={busyId === m.userId}
                  onClick={() => void adjust(m.userId, 1)}
                  aria-label={`Add a stamp for ${m.displayName}`}
                  className="grid size-10 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-yellow"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
