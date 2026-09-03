export type Extra = { n: string; p: number };

export type MenuItem = {
  id: string;
  section: string;
  name: string;
  desc: string;
  price: number;
  from: number;
  to: number;
  soldOut: boolean;
  veg: boolean;
  allergens: string[];
  remove: string[];
  extras: Extra[];
};

export type OrderLine = {
  itemId: string;
  name: string;
  mods: string[];
  unit: number;
  linePrice: number;
  qty: number;
};

export type Order = {
  id?: string;
  no: number;
  lines: OrderLine[];
  stage: number;
  name: string;
  collectTime: string;
  contact: string | null;
  at: number;
  collected: boolean;
  collectedAt?: number;
  pointsEarned?: number;
  discountGbp?: number;
  source?: "app" | "counter";
};

export type Account = {
  name: string;
  contact: string;
};

export type Role = "customer" | "kitchen" | "manager";

export type ReorderNote = {
  ok: string[];
  dropped: { name: string; reason: string }[];
};
