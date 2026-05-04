import { create } from 'zustand';

interface AppState {
  selectedPropertyId: string | null;
  calendarMonth: string;
  planningScrollX: number;
  setSelectedPropertyId: (id: string | null) => void;
  setCalendarMonth: (month: string) => void;
  setPlanningScrollX: (x: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPropertyId: null,
  calendarMonth: new Date().toISOString().slice(0, 7),
  planningScrollX: -1,
  setSelectedPropertyId: (selectedPropertyId) => set({ selectedPropertyId }),
  setCalendarMonth: (calendarMonth) => set({ calendarMonth }),
  setPlanningScrollX: (planningScrollX) => set({ planningScrollX }),
}));
