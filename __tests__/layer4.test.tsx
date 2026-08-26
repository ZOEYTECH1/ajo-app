/**
 * LAYER 4 — Auth/Permissions Audit (Mobile — React Native / Jest)
 * Checks: useAuthStore initial state is unauthenticated, tokens are stored
 * as accessToken/refreshToken, logout clears state, navigation guards auth.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// ─────────────────────────────────────────────────────────────────────────────
// 4.1  AUTH FLOW — token fields and login function
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 4.1 — Authentication flow: auth store', () => {
  let useAuthStore: { getState: () => { user: unknown; accessToken: string | null; refreshToken: string | null; setAuth: (...a: unknown[]) => void; logout: () => void } } | null = null;

  beforeEach(() => {
    try {
      const mod = require('../src/store/useAppStore');
      useAuthStore = mod.useAuthStore;
    } catch {
      useAuthStore = null;
    }
  });

  it('useAuthStore is importable from src/store/useAppStore', () => {
    expect(useAuthStore).not.toBeNull();
  });

  it('initial state: user is null', () => {
    if (!useAuthStore) return;
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });

  it('initial state: accessToken is null', () => {
    if (!useAuthStore) return;
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
  });

  it('initial state: refreshToken is null', () => {
    if (!useAuthStore) return;
    const state = useAuthStore.getState();
    expect(state.refreshToken).toBeNull();
  });

  it('setAuth function exists to store user and tokens after login', () => {
    if (!useAuthStore) return;
    const state = useAuthStore.getState();
    expect(typeof state.setAuth).toBe('function');
  });

  it('logout function exists to clear session', () => {
    if (!useAuthStore) return;
    const state = useAuthStore.getState();
    expect(typeof state.logout).toBe('function');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 4.2  AUTHORIZATION — protected screens check authentication
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 4.2 — Authorization: protected screens reference auth store', () => {
  it('app/_layout.tsx exists (root navigator)', () => {
    expect(fs.existsSync(path.join(APP, '_layout.tsx'))).toBe(true);
  });

  it('app/_layout.tsx references auth store or redirects unauthenticated users', () => {
    const layoutPath = path.join(APP, '_layout.tsx');
    if (!fs.existsSync(layoutPath)) return;
    const content = fs.readFileSync(layoutPath, 'utf8');
    // Should check auth state and redirect
    expect(content).toMatch(/useAuthStore|_hasHydrated|Redirect|redirect|login/i);
  });

  it('inventory screens fetch data with useQuery (React Query)', () => {
    const dashboardPath = path.join(APP, 'inventory', 'dashboard.tsx');
    if (!fs.existsSync(dashboardPath)) return;
    const content = fs.readFileSync(dashboardPath, 'utf8');
    expect(content).toMatch(/useQuery|getDashboard/);
  });

  it('app/login.tsx is the auth entry point', () => {
    expect(fs.existsSync(path.join(APP, 'login.tsx'))).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 4.3  SESSION MANAGEMENT — logout clears tokens
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 4.3 — Session management: logout clears state', () => {
  let useAuthStore: { getState: () => { user: unknown; accessToken: string | null; refreshToken: string | null; setAuth: (u: unknown, a: string, r: string) => void; logout: () => void } } | null = null;

  beforeEach(() => {
    try {
      const mod = require('../src/store/useAppStore');
      useAuthStore = mod.useAuthStore;
    } catch {
      useAuthStore = null;
    }
  });

  it('calling logout() sets user to null', () => {
    if (!useAuthStore) return;
    const store = useAuthStore.getState();
    // Seed state
    store.setAuth(
      { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B', phone_number: null, role: 'member', is_email_verified: true, is_phone_verified: false, is_kyc_verified: false, profile_photo: null, fcm_token: null, date_joined: '' },
      'access_tok',
      'refresh_tok',
    );
    expect(useAuthStore.getState().user).not.toBeNull();

    // Logout
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('logout calls SecureStore.deleteItemAsync for PIN', async () => {
    const SecureStore = require('expo-secure-store');
    if (!useAuthStore) return;
    useAuthStore.getState().logout();
    // The logout function in useAppStore calls deleteItemAsync for the PIN
    await Promise.resolve(); // flush promises
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 4.4  PASSWORD RESET — forgot password screen exists
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 4.4 — Password reset flow', () => {
  it('app/forgot.tsx (forgot password screen) exists', () => {
    expect(fs.existsSync(path.join(APP, 'forgot.tsx'))).toBe(true);
  });

  it('forgot screen has an email input for reset', () => {
    // app/forgot.tsx is a route wrapper; actual UI is in src/AuthScreens.tsx
    const authScreens = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authScreens)) return;
    const content = fs.readFileSync(authScreens, 'utf8');
    expect(content).toMatch(/email/i);
  });
});
