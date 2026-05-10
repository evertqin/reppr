import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConfigInput } from '../../domain/types';

const DEFAULT_CONFIG: ConfigInput = {
  durationMin: 20,
  bodyParts: [],
  goal: 'hypertrophy',
  equipment: ['none'],
  style: 'circuit',
  difficulty: 'intermediate',
};

interface ConfigState {
  draft: ConfigInput;
  setDraft: (patch: Partial<ConfigInput>) => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      draft: DEFAULT_CONFIG,
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: DEFAULT_CONFIG }),
    }),
    { name: 'reppr:configDraft:v1' },
  ),
);
