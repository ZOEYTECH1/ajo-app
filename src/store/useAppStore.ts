import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// ─── Secure storage adapter ───────────────────────────────────────────────────

const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => { await SecureStore.setItemAsync(name, value); },
  removeItem: async (name) => { await SecureStore.deleteItemAsync(name); },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AjoUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  role: 'member' | 'group_admin' | 'super_admin';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_kyc_verified: boolean;
  profile_photo: string | null;
  date_joined: string;
  // Which of the 3 top-level sections ("ajo" | "thrift" | "inventory") this
  // account uses -- account-level (not per-device), shared with ajo-web.
  // Empty array means the user hasn't picked yet.
  selected_modules: ModuleKey[];
}

interface AuthState {
  user: AjoUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  _hasHydrated: boolean;
  setAuth: (user: AjoUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<AjoUser>) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

// ─── Module store (persisted — local mirror of the account-level choice) ─────
//
// The backend's User.selected_modules is the actual source of truth, shared
// with ajo-web -- a choice made on one platform must show up on the other.
// This store stays as a fast local cache (so home.tsx doesn't need to wait
// on a network round-trip to know which tabs to show) that's kept in sync
// both ways:
//   - setSelectedModules/addModule push to the account (best-effort, same
//     "fire and forget" pattern as logout's token revocation) as well as
//     updating local state immediately.
//   - syncFromAccount pulls the account's real value on login/profile fetch
//     and unions it with whatever's already stored locally, self-healing the
//     rare case where a previous addModule's push never reached the backend
//     (e.g. the device was offline at the time).

export type ModuleKey = 'ajo' | 'thrift' | 'inventory';

interface ModuleState {
  selectedModules: ModuleKey[] | null; // null = user hasn't picked yet
  primaryModule: ModuleKey | null;     // the first module the user tapped = default tab
  _moduleHydrated: boolean;
  setSelectedModules: (modules: ModuleKey[], primary: ModuleKey) => void;
  addModule: (module: ModuleKey) => void;
  syncFromAccount: (modules: ModuleKey[]) => void;
  resetModules: () => void;
  setModuleHydrated: (val: boolean) => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set, get) => ({
      selectedModules: null,
      primaryModule: null,
      _moduleHydrated: false,
      setSelectedModules: (modules, primary) => {
        set({ selectedModules: modules, primaryModule: primary });
        pushSelectedModulesToAccount(modules);
      },
      addModule: (module) => {
        const current = get().selectedModules ?? [];
        if (!current.includes(module)) {
          const updated = [...current, module];
          set({
            selectedModules: updated,
            primaryModule: get().primaryModule ?? module,
          });
          pushSelectedModulesToAccount(updated);
        }
      },
      // Local-only -- called right after a fresh value arrives from the
      // backend (login/getMe), so it must never itself push back and cause
      // a pointless round-trip. Unions with whatever's cached locally in
      // case a previous push never reached the server.
      syncFromAccount: (accountModules) => {
        const current = get().selectedModules ?? [];
        const merged = Array.from(new Set([...current, ...accountModules]));
        const changed = merged.length !== current.length || merged.some((m) => !current.includes(m));
        if (!changed && get().selectedModules !== null) return;
        set({
          selectedModules: merged,
          primaryModule: get().primaryModule ?? merged[0] ?? null,
        });
        // The merge found something the account didn't have yet (e.g. an
        // earlier offline addModule) -- push the full merged set back up.
        if (merged.length > accountModules.length) {
          pushSelectedModulesToAccount(merged);
        }
      },
      resetModules: () => set({ selectedModules: null, primaryModule: null }),
      setModuleHydrated: (val) => set({ _moduleHydrated: val }),
    }),
    {
      name: 'ajo-modules',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        selectedModules: state.selectedModules,
        primaryModule: state.primaryModule,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setModuleHydrated(true);
      },
    },
  ),
);

// Best-effort push to the account -- failures are swallowed (matching
// logout's own refresh-token revocation pattern) since the local store
// already reflects the change immediately; syncFromAccount's union logic
// retries the push on the next login if it never landed.
function pushSelectedModulesToAccount(modules: ModuleKey[]) {
  import('../services/authService').then(({ authService }) => {
    authService.updateSelectedModules(modules).catch(() => {});
  });
}

// ─── Inventory store (persisted — remembers last selected location) ──────────

interface InventoryState {
  selectedBusinessId:   number | null;
  selectedBusinessMode: 'retail' | 'warehouse' | 'branch' | null;
  selectedBusinessRole: string | null;
  selectedBusinessName: string | null;
  setSelectedBusiness: (id: number, mode: 'retail' | 'warehouse' | 'branch', role: string, name: string) => void;
  clearSelectedBusiness: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      selectedBusinessId:   null,
      selectedBusinessMode: null,
      selectedBusinessRole: null,
      selectedBusinessName: null,
      setSelectedBusiness: (id, mode, role, name) =>
        set({ selectedBusinessId: id, selectedBusinessMode: mode, selectedBusinessRole: role, selectedBusinessName: name }),
      clearSelectedBusiness: () =>
        set({ selectedBusinessId: null, selectedBusinessMode: null, selectedBusinessRole: null, selectedBusinessName: null }),
    }),
    {
      name: 'ajo-inventory',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);

// ─── Auth store (persisted to SecureStore) ────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () => {
        SecureStore.deleteItemAsync('ajo_pin').catch(() => {});
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'ajo-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
