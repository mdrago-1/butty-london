import { createFileRoute } from "@tanstack/react-router";
import { Counter } from "@/components/counter";
import { StaffGate } from "@/components/staff-gate";

export const Route = createFileRoute("/counter")({
  component: CounterPage,
  head: () => ({
    meta: [{ title: "Counter — Butty & Co." }],
  }),
});

function CounterPage() {
  return (
    <StaffGate
      role="kitchen"
      eitherStaff
      title="Counter"
      hint="Till for walk-in orders. Kitchen or office password."
    >
      <Counter />
    </StaffGate>
  );
}
