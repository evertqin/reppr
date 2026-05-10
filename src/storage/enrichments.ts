import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EnrichmentDoc } from '../data/enrichmentSchema';

export interface UserEnrichmentSource {
  id: string;
  name: string;
  importedAt: string;
  enabled: boolean;
  doc: EnrichmentDoc;
}

interface EnrichmentState {
  sources: UserEnrichmentSource[];
  addSource: (s: UserEnrichmentSource) => void;
  removeSource: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
}

export const useEnrichmentStore = create<EnrichmentState>()(
  persist(
    (set) => ({
      sources: [],
      addSource: (s) => set((st) => ({ sources: [s, ...st.sources] })),
      removeSource: (id) => set((st) => ({ sources: st.sources.filter((x) => x.id !== id) })),
      setEnabled: (id, enabled) =>
        set((st) => ({
          sources: st.sources.map((x) => (x.id === id ? { ...x, enabled } : x)),
        })),
    }),
    { name: 'reppr:enrichments:v1' },
  ),
);

export function activeUserEnrichments(): EnrichmentDoc[] {
  return useEnrichmentStore.getState().sources.filter((s) => s.enabled).map((s) => s.doc);
}
