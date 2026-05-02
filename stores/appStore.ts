import { create } from 'zustand';

interface AppState {
  selectedPropertyId: string | null;
  calendarMonth: string;
  setSelectedPropertyId: (id: string | null) => void;
  setCalendarMonth: (month: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPropertyId: null,
  calendarMonth: new Date().toISOString().slice(0, 7),
  setSelectedPropertyId: (selectedPropertyId) => set({ selectedPropertyId }),
  setCalendarMonth: (calendarMonth) => set({ calendarMonth }),
}));
