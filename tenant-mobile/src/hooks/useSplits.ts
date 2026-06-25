/**
 * "Splits" — roommate expense splitting, stored entirely on-device.
 *
 * A tenant-to-tenant feature (independent of the owner): track shared costs
 * like groceries, water cans, WiFi and snacks, and see who owes whom. Fully
 * offline, persisted in AsyncStorage. No backend required.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'splits_state_v1';
export const YOU_ID = 'you';

export type Member = { id: string; name: string };

export type Expense = {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  date: string; // ISO yyyy-mm-dd
};

export type SplitState = { members: Member[]; expenses: Expense[] };

export type Balance = { member: Member; net: number }; // net > 0 → is owed; < 0 → owes

const initialState: SplitState = {
  members: [{ id: YOU_ID, name: 'You' }],
  expenses: [],
};

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** Pure: net balance per member across all expenses (equal split per expense). */
export function computeBalances(state: SplitState): Balance[] {
  const net: Record<string, number> = {};
  state.members.forEach((m) => (net[m.id] = 0));

  for (const e of state.expenses) {
    const parts = e.participantIds.filter((id) => net[id] !== undefined);
    if (parts.length === 0) continue;
    const share = e.amount / parts.length;
    if (net[e.paidById] !== undefined) net[e.paidById] += e.amount;
    parts.forEach((id) => (net[id] -= share));
  }

  return state.members.map((m) => ({ member: m, net: Math.round((net[m.id] || 0) * 100) / 100 }));
}

export function useSplits() {
  const [state, setState] = useState<SplitState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SplitState;
          if (parsed?.members?.length) setState(parsed);
        }
      } catch {
        // ignore — start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback((next: SplitState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addMember = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const exists = state.members.some((m) => m.name.toLowerCase() === clean.toLowerCase());
      if (exists) return;
      persist({ ...state, members: [...state.members, { id: uid(), name: clean }] });
    },
    [state, persist],
  );

  const removeMember = useCallback(
    (id: string) => {
      if (id === YOU_ID) return;
      persist({
        members: state.members.filter((m) => m.id !== id),
        expenses: state.expenses
          .filter((e) => e.paidById !== id)
          .map((e) => ({ ...e, participantIds: e.participantIds.filter((p) => p !== id) })),
      });
    },
    [state, persist],
  );

  const addExpense = useCallback(
    (input: { title: string; amount: number; paidById: string; participantIds: string[] }) => {
      if (!input.title.trim() || input.amount <= 0 || input.participantIds.length === 0) return;
      const expense: Expense = {
        id: uid(),
        title: input.title.trim(),
        amount: input.amount,
        paidById: input.paidById,
        participantIds: input.participantIds,
        date: new Date().toISOString().slice(0, 10),
      };
      persist({ ...state, expenses: [expense, ...state.expenses] });
    },
    [state, persist],
  );

  const removeExpense = useCallback(
    (id: string) => persist({ ...state, expenses: state.expenses.filter((e) => e.id !== id) }),
    [state, persist],
  );

  const settleAll = useCallback(() => persist({ ...state, expenses: [] }), [state, persist]);

  return {
    loaded,
    members: state.members,
    expenses: state.expenses,
    balances: computeBalances(state),
    addMember,
    removeMember,
    addExpense,
    removeExpense,
    settleAll,
  };
}
