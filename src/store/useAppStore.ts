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
  fcm_token: string | null;
  date_joined: string;
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

// ─── Module store (persisted — remembers which modules the user uses) ────────

export type ModuleKey = 'ajo' | 'thrift' | 'inventory';

interface ModuleState {
  selectedModules: ModuleKey[] | null; // null = user hasn't picked yet
  primaryModule: ModuleKey | null;     // the first module the user tapped = default tab
  _moduleHydrated: boolean;
  setSelectedModules: (modules: ModuleKey[], primary: ModuleKey) => void;
  addModule: (module: ModuleKey) => void;
  setModuleHydrated: (val: boolean) => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set, get) => ({
      selectedModules: null,
      primaryModule: null,
      _moduleHydrated: false,
      setSelectedModules: (modules, primary) =>
        set({ selectedModules: modules, primaryModule: primary }),
      addModule: (module) => {
        const current = get().selectedModules ?? [];
        if (!current.includes(module)) {
          set({
            selectedModules: [...current, module],
            primaryModule: get().primaryModule ?? module,
          });
        }
      },
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
