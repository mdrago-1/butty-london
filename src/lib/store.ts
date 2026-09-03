import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED } from "./menu";
import {
  getLoyaltyProfile,
  getMyOrders,
  saveTicketName,
  setLoyaltyOptIn,
} from "./loyalty-api";
import type { LoyaltyProfile } from "./loyalty";
import {
  deleteMenuItem as apiDeleteItem,
  getShopSnapshot,
  markOrderCollected,
  placeCounterOrder as apiPlaceCounter,
  placeShopOrder,
  setOrderStage,
  setShopFlags,
  toggleSoldOut,
  upsertMenuItem as apiUpsertItem,
} from "./shop-api";
import type { Account, MenuItem, Order, OrderLine } from "./types";

type PlaceInput = {
  lines: OrderLine[];
  name: string;
  collectTime: string;
  contact: string | null;
  redeemReward?: boolean;
};

type ShopState = {
  ready: boolean;
  menu: MenuItem[];
  shopOpen: boolean;
  specialsPaused: boolean;
  renovating: boolean;
  orders: Order[];
  mine: Order[];
  loyalty: LoyaltyProfile | null;
  account: Account | null;
  myOrderNo: number | null;
  myOrderNos: number[];
  demoHour: number;
  setDemoHour: (h: number) => void;
  setAccount: (a: Account | null) => void;
  setMyOrderNo: (n: number | null) => void;
  refresh: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  setClubOptIn: (optedIn: boolean, displayName?: string) => Promise<void>;
  saveName: (displayName: string) => Promise<void>;
  placeOrder: (o: PlaceInput) => Promise<number>;
  placeCounterOrder: (o: {
    lines: OrderLine[];
    name: string;
    memberUserId?: string | null;
    redeemReward?: boolean;
  }) => Promise<number>;
  setStage: (no: number, stage: number) => Promise<void>;
  markCollected: (no: number) => Promise<void>;
  upsertItem: (item: MenuItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleSold: (id: string) => Promise<void>;
  setShopOpen: (v: boolean) => Promise<void>;
  setSpecialsPaused: (v: boolean) => Promise<void>;
  setRenovating: (v: boolean) => Promise<void>;
  clearLocalProfile: () => void;
};

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      ready: false,
      menu: SEED,
      shopOpen: true,
      specialsPaused: false,
      renovating: true,
      orders: [],
      mine: [],
      loyalty: null,
      account: null,
      myOrderNo: null,
      myOrderNos: [],
      demoHour: 12,
      setDemoHour: (h) => set({ demoHour: h }),
      setAccount: (a) => set({ account: a }),
      setMyOrderNo: (n) => set({ myOrderNo: n }),
      refresh: async () => {
        try {
          const snap = await getShopSnapshot();
          set({
            menu: snap.menu,
            shopOpen: snap.shopOpen,
            specialsPaused: snap.specialsPaused,
            renovating: snap.renovating,
            orders: snap.orders,
            ready: true,
          });
        } catch {
          set({ ready: true });
        }
      },
      refreshAccount: async () => {
        try {
          const [loyalty, mine] = await Promise.all([
            getLoyaltyProfile(),
            getMyOrders(),
          ]);
          set({ loyalty, mine });
        } catch {
          set({ loyalty: null, mine: [] });
        }
      },
      setClubOptIn: async (optedIn, displayName) => {
        const loyalty = await setLoyaltyOptIn({
          data: { optedIn, displayName },
        });
        set({ loyalty });
      },
      saveName: async (displayName) => {
        await saveTicketName({ data: { displayName } });
        await get().refreshAccount();
      },
      placeOrder: async (o) => {
        const order = await placeShopOrder({
          data: {
            lines: o.lines,
            name: o.name,
            collectTime: o.collectTime,
            redeemReward: o.redeemReward,
          },
        });
        const nos = [order.no, ...get().myOrderNos.filter((n) => n !== order.no)].slice(
          0,
          40,
        );
        set({
          myOrderNo: order.no,
          myOrderNos: nos,
          orders: [order, ...get().orders.filter((x) => x.no !== order.no)],
        });
        await get().refresh();
        await get().refreshAccount();
        return order.no;
      },
      placeCounterOrder: async (o) => {
        const order = await apiPlaceCounter({
          data: {
            lines: o.lines,
            name: o.name,
            memberUserId: o.memberUserId,
            redeemReward: o.redeemReward,
          },
        });
        set({
          orders: [order, ...get().orders.filter((x) => x.no !== order.no)],
        });
        await get().refresh();
        return order.no;
      },
      setStage: async (no, stage) => {
        await setOrderStage({ data: { no, stage } });
        await get().refresh();
      },
      markCollected: async (no) => {
        await markOrderCollected({ data: { no } });
        await get().refresh();
      },
      upsertItem: async (item) => {
        await apiUpsertItem({ data: item });
        await get().refresh();
      },
      deleteItem: async (id) => {
        await apiDeleteItem({ data: { id } });
        await get().refresh();
      },
      toggleSold: async (id) => {
        const item = get().menu.find((m) => m.id === id);
        await toggleSoldOut({ data: { id, soldOut: !item?.soldOut } });
        await get().refresh();
      },
      setShopOpen: async (v) => {
        await setShopFlags({ data: { shopOpen: v } });
        await get().refresh();
      },
      setSpecialsPaused: async (v) => {
        await setShopFlags({ data: { specialsPaused: v } });
        await get().refresh();
      },
      setRenovating: async (v) => {
        await setShopFlags({ data: { renovating: v } });
        await get().refresh();
      },
      clearLocalProfile: () =>
        set({ account: null, myOrderNo: null, myOrderNos: [], mine: [] }),
    }),
    {
      name: "butty-co-v3",
      partialize: (s) => ({
        account: s.account,
        myOrderNo: s.myOrderNo,
        myOrderNos: s.myOrderNos,
        demoHour: s.demoHour,
      }),
    },
  ),
);
