import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompletedSession, WorkoutPlan } from '../../domain/types';

interface PlansState {
  plans: WorkoutPlan[];
  sessions: CompletedSession[];
  upsertPlan: (plan: WorkoutPlan) => void;
  removePlan: (id: string) => void;
  appendSession: (s: CompletedSession) => void;
  importAll: (data: { plans?: WorkoutPlan[]; sessions?: CompletedSession[] }) => void;
  clear: () => void;
}

export const usePlansStore = create<PlansState>()(
  persist(
    (set) => ({
      plans: [],
      sessions: [],
      upsertPlan: (plan) =>
        set((s) => {
          const others = s.plans.filter((p) => p.id !== plan.id);
          return { plans: [plan, ...others] };
        }),
      removePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      appendSession: (sess) => set((s) => ({ sessions: [sess, ...s.sessions] })),
      importAll: ({ plans, sessions }) =>
        set((s) => ({
          plans: plans ?? s.plans,
          sessions: sessions ?? s.sessions,
        })),
      clear: () => set({ plans: [], sessions: [] }),
    }),
    { name: 'reppr:plans:v1' },
  ),
);
