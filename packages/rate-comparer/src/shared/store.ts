import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";

// --- State Types ---
export interface User {
  uid: string;
  email: string;
  role: string;
  tenantId?: string;
  displayName?: string;
}

export interface LocationItem {
  code: string;
  name: string;
  country: string;
}

export interface AppState {
  user: User | null;
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  currency: string;
  language: string;
  quoteCart: any[];
  catalogs: {
    locations: LocationItem[];
    customers: Array<{ id: string; name: string }>;
  };
}

const initialState: AppState = {
  user: null,
  sidebarOpen: true,
  theme: "system",
  currency: "USD",
  language: "es",
  quoteCart: [],
  catalogs: {
    locations: [],
    customers: [],
  },
};

// --- App Slice ---
export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark" | "system">) => {
      state.theme = action.payload;
    },
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    addToCart: (state, action: PayloadAction<any>) => {
      state.quoteCart.push(action.payload);
    },
    setLocations: (state, action: PayloadAction<LocationItem[]>) => {
      state.catalogs.locations = action.payload;
    },
    setCustomers: (
      state,
      action: PayloadAction<Array<{ id: string; name: string }>>,
    ) => {
      state.catalogs.customers = action.payload;
    },
  },
});

export const {
  setUser,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setCurrency,
  setLanguage,
  addToCart,
  setLocations,
  setCustomers,
} = appSlice.actions;

// --- Store Configuration ---
export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { useDispatch, useSelector } from "react-redux";
export const useAppStore = () => {
  const dispatch = useDispatch();
  const state = useSelector((s: RootState) => s.app);
  return { 
    ...state, 
    setCurrency: (cur: string) => dispatch(appSlice.actions.setCurrency(cur)),
    setLanguage: (lang: string) => dispatch(appSlice.actions.setLanguage(lang)),
    toggleSidebar: () => dispatch(appSlice.actions.toggleSidebar()),
    dispatch 
  };
};
