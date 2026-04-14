import { create } from 'zustand';
import type { Opportunity, CurrentUser } from '../types';

interface AppState {
  // Auth
  currentUser: CurrentUser | null;
  setCurrentUser: (u: CurrentUser | null) => void;

  // Opportunities (loaded from API, cached locally)
  opps: Opportunity[];
  setOpps: (opps: Opportunity[]) => void;
  upsertOpp: (opp: Opportunity) => void;
  removeOpp: (id: string) => void;

  // Active opportunity
  currentOppId: string | null;
  setCurrentOppId: (id: string | null) => void;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),

  opps: [],
  setOpps: (opps) => set({ opps }),
  upsertOpp: (opp) =>
    set((s) => {
      const idx = s.opps.findIndex(o => o.id === opp.id);
      const next = [...s.opps];
      if (idx >= 0) next[idx] = opp; else next.unshift(opp);
      return { opps: next };
    }),
  removeOpp: (id) =>
    set((s) => ({ opps: s.opps.filter(o => o.id !== id) })),

  currentOppId: null,
  setCurrentOppId: (id) => set({ currentOppId: id }),

  activeTab: 'calculator',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
