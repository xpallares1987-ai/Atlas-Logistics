import { create } from "zustand";

export interface AppState {
  currency: string;
  language: string;
  quoteCart: any[];
  setCurrency: (currency: string) => void;
  setLanguage: (language: string) => void;
  addToCart: (item: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currency: "USD",
  language: "es",
  quoteCart: [],
  setCurrency: (currency) => set({ currency }),
  setLanguage: (language) => set({ language }),
  addToCart: (item) => set((state) => ({ quoteCart: [...state.quoteCart, item] })),
}));
