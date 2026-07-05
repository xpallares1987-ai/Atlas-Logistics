import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FreightRateMock } from '../../data/mockRates';

interface BookingState {
  bookedRates: FreightRateMock[];
}

const initialState: BookingState = {
  bookedRates: [],
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    addBooking: (state, action: PayloadAction<FreightRateMock>) => {
      // Prevent duplicates by ID
      if (!state.bookedRates.find(r => r.id === action.payload.id)) {
        state.bookedRates.push(action.payload);
      }
    },
    removeBooking: (state, action: PayloadAction<string>) => {
      state.bookedRates = state.bookedRates.filter(r => r.id !== action.payload);
    },
  },
});

export const { addBooking, removeBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
