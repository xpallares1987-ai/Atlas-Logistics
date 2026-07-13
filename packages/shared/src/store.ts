import { create } from "zustand";

export interface AppState {
  currency: string;
  language: string;
  quoteCart: any[];
  setCurrency: (currency: string) => void;
  setLanguage: (language: string) => void;
  addToCart: (item: any) => void;
}

export const useAppStore = create<AppState>((set: any) => ({
  currency: "USD",
  language: "es",
  quoteCart: [],
  setCurrency: (currency: string) => set({ currency }),
  setLanguage: (language: string) => set({ language }),
  addToCart: (item: any) => set((state: AppState) => ({ quoteCart: [...state.quoteCart, item] })),
}));
