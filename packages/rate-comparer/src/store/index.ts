// @ts-nocheck
import { configureStore } from "@reduxjs/toolkit";
import currencyReducer from "./slices/currencySlice";
import bookingReducer from "./slices/bookingSlice";

export const store = configureStore({
  reducer: {
    currency: currencyReducer,
    booking: bookingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

