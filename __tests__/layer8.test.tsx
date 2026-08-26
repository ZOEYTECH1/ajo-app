/**
 * LAYER 8 — Security Audit (Mobile — React Native / Jest)
 * Checks: no eval() with user input, no passwords logged, tokens not
 * hardcoded, auth store starts unauthenticated, HTTPS for production URLs.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 8.1  INJECTION PREVENTION
// React Native doesn't run DOM XSS. Key risks: eval() with user data,
// unsafe WebView injectedJavaScript.
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 8.1 — Injection prevention', () => {
  it('no source file calls eval() with user-supplied data', () => {
    const suspicious: string[] = [];
    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', 'ios', 'android', '__tests__'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/\beval\s*\(/.test(content)) suspicious.push(entry.name);
        }
      }
    }
    scanDir(SRC);
    scanDir(APP);
    expect(suspicious).toHaveLength(0);
  });

  it('no WebView injects user data into injectedJavaScript', () => {
    let found = false;
    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', '__tests__'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (content.includes('WebView') && content.includes('injectedJavaScript')) {
            if (/injectedJavaScript.*\$\{.*(input|value|user)/i.test(content)) found = true;
          }
        }
      }
    }
    scanDir(SRC);
    scanDir(APP);
    expect(found).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.2  SECRETS MANAGEMENT — tokens stored securely, not logged
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 8.2 — Secrets management: secure token handling', () => {
  it('no source file logs accessToken or refreshToken to console', () => {
    const loggedTokenFiles: string[] = [];
    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', '__tests__'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/console\.log\s*\(.*(?:accessToken|refreshToken|Bearer)/i.test(content)) {
            loggedTokenFiles.push(entry.name);
          }
        }
      }
    }
    scanDir(SRC);
    scanDir(APP);
    expect(loggedTokenFiles).toHaveLength(0);
  });

  it('auth store does not have a password field', () => {
    const storePath = path.join(SRC, 'store', 'useAppStore.ts');
    expect(fs.existsSync(storePath)).toBe(true);
    const content = fs.readFileSync(storePath, 'utf8');
    // password should not be a stored field
    expect(content).not.toMatch(/^\s+password\s*:/m);
  });

  it('no hardcoded Bearer token in any source file', () => {
    const suspicious: string[] = [];
    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', '__tests__'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (/\.(tsx?|ts)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/Bearer\s+[a-zA-Z0-9_-]{30,}/.test(content)) suspicious.push(entry.name);
        }
      }
    }
    scanDir(SRC);
    expect(suspicious).toHaveLength(0);
  });

  it('tokens stored in expo-secure-store (not AsyncStorage)', () => {
    const storePath = path.join(SRC, 'store', 'useAppStore.ts');
    const content = fs.readFileSync(storePath, 'utf8');
    expect(content).toMatch(/expo-secure-store|SecureStore/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.3  AUTHENTICATION ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 8.3 — Authentication enforcement: store starts unauthenticated', () => {
  it('useAuthStore initial state has null user', () => {
    const { useAuthStore } = require('../src/store/useAppStore');
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });

  it('useAuthStore initial state has null accessToken', () => {
    const { useAuthStore } = require('../src/store/useAppStore');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
  });

  it('useAuthStore initial state has null refreshToken', () => {
    const { useAuthStore } = require('../src/store/useAppStore');
    const state = useAuthStore.getState();
    expect(state.refreshToken).toBeNull();
  });

  it('auth store does not expose a raw password', () => {
    const { useAuthStore } = require('../src/store/useAppStore');
    const state = useAuthStore.getState();
    expect(state).not.toHaveProperty('password');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.4  NETWORK SECURITY — HTTPS for production, no withCredentials misuse
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 8.4 — Network security: HTTPS and headers', () => {
  it('api.ts does not use plain HTTP for a hardcoded production URL', () => {
    const apiPath = path.join(SRC, 'services', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    // Allow http://localhost and http://10.0.2.2 (Android emulator) — those are fine
    const hasUnsafeHttp = /http:\/\/(?!localhost|127\.0\.0\.1|10\.0\.2\.2)[a-z0-9.-]+/i.test(content);
    expect(hasUnsafeHttp).toBe(false);
  });

  it('api.ts does not set withCredentials: true (uses Bearer token instead)', () => {
    const apiPath = path.join(SRC, 'services', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).not.toMatch(/withCredentials\s*:\s*true/);
  });

  it('no Stripe live keys in source', () => {
    const suspicious: string[] = [];
    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', 'ios', 'android', '__tests__'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/sk_live_[a-zA-Z0-9]{20,}/.test(content)) suspicious.push(entry.name);
        }
      }
    }
    scanDir(SRC);
    expect(suspicious).toHaveLength(0);
  });
});
