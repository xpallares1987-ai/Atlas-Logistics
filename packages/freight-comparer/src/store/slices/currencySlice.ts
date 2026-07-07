import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Currency = "USD" | "EUR";

interface CurrencyState {
  current: Currency;
  rates: Record<Currency, number>; // Base is USD
}

const initialState: CurrencyState = {
  current: "USD",
  rates: {
    USD: 1,
    EUR: 0.92, // Mock exchange rate for MVP
  },
};

export const currencySlice = createSlice({
  name: "currency",
  initialState,
  reducers: {
    setCurrency: (state, action: PayloadAction<Currency>) => {
      state.current = action.payload;
    },
  },
});

export const { setCurrency } = currencySlice.actions;
export default currencySlice.reducer;
