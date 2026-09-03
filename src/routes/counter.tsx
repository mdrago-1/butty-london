import { createFileRoute } from "@tanstack/react-router";
import { Counter } from "@/components/counter";
import { TillShell } from "@/components/till-shell";

export const Route = createFileRoute("/counter")({
  component: CounterPage,
  head: () => ({
    meta: [{ title: "Counter — Butty & Co." }],
  }),
});

function CounterPage() {
  return (
    <TillShell>
      <Counter />
    </TillShell>
  );
}
