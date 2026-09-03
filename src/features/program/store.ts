import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProgramSessionLog } from './model';

interface ProgramStoreState {
  activeProgramId: string;
  sessionCursor: number;
  selectedDayId: string | null;
  logs: ProgramSessionLog[];
  selectDay: (dayId: string | null) => void;
  appendLog: (log: ProgramSessionLog) => void;
  advancePrimarySession: () => void;
  resetProgram: () => void;
}

const DEFAULT_PROGRAM_ID = 'hypertrophy-12w-v1';

export const useProgramStore = create<ProgramStoreState>()(
  persist(
    (set) => ({
      activeProgramId: DEFAULT_PROGRAM_ID,
      sessionCursor: 0,
      selectedDayId: null,
      logs: [],
      selectDay: (dayId) => set({ selectedDayId: dayId }),
      appendLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
      advancePrimarySession: () =>
        set((state) => ({
          sessionCursor: state.sessionCursor + 1,
          selectedDayId: null,
        })),
      resetProgram: () =>
        set({
          activeProgramId: DEFAULT_PROGRAM_ID,
          sessionCursor: 0,
          selectedDayId: null,
          logs: [],
        }),
    }),
    { name: 'reppr:program:v1' },
  ),
);
