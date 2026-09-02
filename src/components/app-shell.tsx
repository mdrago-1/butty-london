import { useEffect, useState } from "react";
import { Customer } from "@/components/customer";
import { Splash } from "@/components/logo";
import { useShop } from "@/lib/store";

export function AppShell() {
  const [mounted, setMounted] = useState(false);
  const refresh = useShop((s) => s.refresh);

  useEffect(() => {
    setMounted(true);
    void refresh();
    const t = window.setInterval(() => {
      void useShop.getState().refresh();
    }, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);

  if (!mounted) return <Splash />;

  return (
    <div className="min-h-dvh bg-butty-yellow font-sans text-butty-ink">
      <Customer />
    </div>
  );
}
