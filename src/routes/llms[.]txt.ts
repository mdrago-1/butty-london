import { createFileRoute } from "@tanstack/react-router";
import { getPublicMenu } from "@/lib/shop-api";
import { menuForBotsText } from "@/lib/venue";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const menu = await getPublicMenu();
          return new Response(menuForBotsText(menu), {
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "public, max-age=300",
            },
          });
        } catch {
          return new Response(
            "Butty & Co. menu is temporarily unavailable.\n",
            {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            },
          );
        }
      },
    },
  },
});
