import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getPublicMenu } from "@/lib/shop-api";
import { menuJsonLd, type MenuOfferSource } from "@/lib/venue";

type Search = { view?: string };

const emptyMenu: MenuOfferSource = { renovating: true, items: [] };

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    if (typeof raw.view === "string") return { view: raw.view };
    return {};
  },
  loader: async (): Promise<MenuOfferSource> => {
    try {
      return await getPublicMenu();
    } catch {
      return emptyMenu;
    }
  },
  head: ({ loaderData }) => {
    const menu = loaderData ?? emptyMenu;
    const json = JSON.stringify(menuJsonLd(menu)).replace(/</g, "\\u003c");
    return {
      meta: [
        { title: "Butty & Co. — Sandwich & Juice Bar" },
        {
          name: "description",
          content:
            "Butty & Co. sandwich and juice bar, 19 Replingham Road, Southfields. Live menu and prices in GBP.",
        },
      ],
      links: [
        {
          rel: "alternate",
          type: "text/plain",
          href: "/llms.txt",
          title: "Butty & Co. menu for assistants",
        },
      ],
      scripts: [{ type: "application/ld+json", children: json }],
    };
  },
  component: Home,
});

function Home() {
  const { view } = Route.useSearch();
  const menu = Route.useLoaderData();
  if (view === "kitchen") return <Navigate to="/kitchen" />;
  if (view === "manager" || view === "office") return <Navigate to="/office" />;
  return (
    <>
      <noscript>
        <article>
          <h1>Butty & Co. menu</h1>
          <p>
            Prices in GBP. 19 Replingham Road, Southfields, London SW18 5LT.
          </p>
          <ul>
            {menu.items.map((item) => (
              <li key={`${item.section}-${item.name}`}>
                {item.name} — £{item.price.toFixed(2)}
                {item.desc ? `. ${item.desc}` : ""}
                {item.soldOut ? " (sold out)" : ""}
              </li>
            ))}
          </ul>
        </article>
      </noscript>
      <AppShell />
    </>
  );
}