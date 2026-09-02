import { createFileRoute } from "@tanstack/react-router";
import { Manager } from "@/components/manager";
import { StaffGate } from "@/components/staff-gate";

export const Route = createFileRoute("/office")({
  component: OfficePage,
  head: () => ({
    meta: [{ title: "Back office — Butty & Co." }],
  }),
});

function OfficePage() {
  return (
    <StaffGate
      role="manager"
      title="Back office"
      hint="Menu, hours, and the Butty Club. Enter the office password."
    >
      <Manager />
    </StaffGate>
  );
}
