import { createFileRoute } from "@tanstack/react-router";
import { Kitchen } from "@/components/kitchen";
import { StaffGate } from "@/components/staff-gate";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
  head: () => ({
    meta: [{ title: "Kitchen — Butty & Co." }],
  }),
});

function KitchenPage() {
  return (
    <StaffGate
      role="kitchen"
      title="Kitchen"
      hint="Staff only. Enter the kitchen password to see live tickets."
    >
      <Kitchen />
    </StaffGate>
  );
}
