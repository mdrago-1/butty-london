import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

type Search = { view?: string };

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    if (typeof raw.view === "string") return { view: raw.view };
    return {};
  },
  component: Home,
  head: () => ({
    meta: [
      { title: "Butty & Co. — Sandwich & Juice Bar" },
      {
        name: "description",
        content:
          "Order ahead for collection from Butty & Co., Southfields.",
      },
    ],
  }),
});

function Home() {
  const { view } = Route.useSearch();
  if (view === "kitchen") return <Navigate to="/kitchen" />;
  if (view === "manager" || view === "office") return <Navigate to="/office" />;
  return <AppShell />;
}
