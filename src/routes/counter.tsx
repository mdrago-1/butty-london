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
      pin
      title="Counter"
      hint="Enter your code to open the till and start your shift."
    >
      <Counter />
    </StaffGate>
  );
}
