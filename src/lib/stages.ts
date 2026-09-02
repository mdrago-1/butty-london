import {
  Bell,
  Check,
  ChefHat,
  Package,
  type LucideIcon,
} from "lucide-react";

export type Stage = {
  key: string;
  label: string;
  cust: string;
  icon: LucideIcon;
  color: "ink" | "red" | "green";
};

export const STAGES: Stage[] = [
  {
    key: "received",
    label: "Order received",
    cust: "We've got your order",
    icon: Check,
    color: "ink",
  },
  {
    key: "started",
    label: "Order started",
    cust: "Being made fresh",
    icon: ChefHat,
    color: "red",
  },
  {
    key: "packed",
    label: "Being packed",
    cust: "Almost ready",
    icon: Package,
    color: "red",
  },
  {
    key: "ready",
    label: "Ready to collect",
    cust: "Ready — come on in!",
    icon: Bell,
    color: "green",
  },
];

export const STAGE_TEXT: Record<Stage["color"], string> = {
  ink: "text-butty-ink",
  red: "text-butty-red",
  green: "text-butty-green",
};

export const STAGE_BG: Record<Stage["color"], string> = {
  ink: "bg-butty-ink",
  red: "bg-butty-red",
  green: "bg-butty-green",
};
