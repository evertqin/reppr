import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'auto' | 'light' | 'dark';

export interface SettingsState {
  beepsEnabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: string | null;
  ttsRate: number;
  ttsVolume: number;
  beepVolume: number;
  theme: Theme;
  setBeepsEnabled: (v: boolean) => void;
  setTtsEnabled: (v: boolean) => void;
  setTtsVoice: (v: string | null) => void;
  setTtsRate: (v: number) => void;
  setTtsVolume: (v: number) => void;
  setBeepVolume: (v: number) => void;
  setTheme: (t: Theme) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      beepsEnabled: true,
      ttsEnabled: true,
      ttsVoice: null,
      ttsRate: 1.0,
      ttsVolume: 1.0,
      beepVolume: 0.5,
      theme: 'dark',
      setBeepsEnabled: (v) => set({ beepsEnabled: v }),
      setTtsEnabled: (v) => set({ ttsEnabled: v }),
      setTtsVoice: (v) => set({ ttsVoice: v }),
      setTtsRate: (v) => set({ ttsRate: v }),
      setTtsVolume: (v) => set({ ttsVolume: v }),
      setBeepVolume: (v) => set({ beepVolume: v }),
      setTheme: (t) => set({ theme: t }),
    }),
    { name: 'reppr:settings:v2' },
  ),
);
