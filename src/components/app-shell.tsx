import { useEffect } from "react";
import { Customer } from "@/components/customer";
import { Splash } from "@/components/logo";
import { useShop } from "@/lib/store";

export function AppShell() {
  const refresh = useShop((s) => s.refresh);
  const ready = useShop((s) => s.ready);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      void useShop.getState().refresh();
    }, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);

  if (!ready) return <Splash />;

  return (
    <div className="min-h-dvh bg-butty-yellow font-sans text-butty-ink">
      <Customer />
    </div>
  );
}
