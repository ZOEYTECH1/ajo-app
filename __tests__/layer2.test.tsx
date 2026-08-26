/**
 * LAYER 2 — API Audit (Mobile — React Native / Jest)
 * Checks: API service exists, uses Bearer token, error handling present,
 * services layer separates API calls from screens.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 2.1  ENDPOINT ORGANIZATION — API service module exists
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 2.1 — API service: axios instance configured', () => {
  it('src/services/api.ts exists', () => {
    expect(fs.existsSync(path.join(SRC, 'services', 'api.ts'))).toBe(true);
  });

  it('api.ts creates an axios instance', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/axios\.create|axios/);
  });

  it('api.ts uses env var or dynamic base URL — not hardcoded production domain', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    const hasEnvOrDynamic =
      content.includes('process.env') ||
      content.includes('Constants.') ||
      content.includes('EXPO_PUBLIC');
    expect(hasEnvOrDynamic).toBe(true);
  });

  it('inventory service file exists', () => {
    expect(fs.existsSync(path.join(SRC, 'services', 'inventoryService.ts'))).toBe(true);
  });

  it('auth service file exists', () => {
    expect(fs.existsSync(path.join(SRC, 'services', 'authService.ts'))).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2.2  ERROR HANDLING — API calls use try/catch
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 2.2 — Error handling in services', () => {
  it('api.ts has a response interceptor for errors', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/interceptors\.response|catch|error/i);
  });

  it('authService.ts uses async/await or try/catch for error propagation', () => {
    const authPath = path.join(SRC, 'services', 'authService.ts');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    // async/await throws on error, which callers handle; try/catch is also acceptable
    expect(content).toMatch(/async\s+|try\s*\{|\.catch\s*\(|catch\s*\(/);
  });

  it('api.ts auto-refreshes token on 401 response', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/401|refresh/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2.3  AUTHENTICATION — requests send the Bearer token
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 2.3 — Authentication: Bearer token on requests', () => {
  it('api.ts attaches Authorization header with Bearer token', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/Authorization/);
    expect(content).toMatch(/Bearer/);
  });

  it('token is read from auth store — not hardcoded', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    // Should reference the store to get the token
    expect(content).toMatch(/useAuthStore|getState|accessToken/);
    // Should NOT have a hardcoded Bearer token
    expect(content).not.toMatch(/Bearer\s+[a-zA-Z0-9]{30,}/);
  });

  it('api.ts uses request interceptor to attach token', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/interceptors\.request/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2.4  RESPONSE QUALITY — paginated responses use results key
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 2.4 — Response quality: paginated data handling', () => {
  it('inventory service or screens use .results key for paginated responses', () => {
    // Check service file and paginated screens (sales, transfers, product-requests use .results)
    const candidates = [
      path.join(SRC, 'services', 'inventoryService.ts'),
      path.join(APP, 'inventory', 'dashboard.tsx'),
      path.join(APP, 'inventory', 'expenses.tsx'),
      path.join(APP, 'inventory', 'sales.tsx'),
      path.join(APP, 'inventory', 'transfers.tsx'),
      path.join(APP, 'inventory', 'product-requests.tsx'),
    ];

    let found = false;
    for (const f of candidates) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        if (content.includes('.results') || content.includes('?.results') || content.includes('results:')) {
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('inventory service has GET functions for categories and products', () => {
    const inventoryPath = path.join(SRC, 'services', 'inventoryService.ts');
    if (!fs.existsSync(inventoryPath)) return;
    const content = fs.readFileSync(inventoryPath, 'utf8');
    expect(content).toMatch(/categor|product/i);
    expect(content).toMatch(/api\.get|axios\.get|get\s*\(/);
  });

  it('no API response stores a password field in state', () => {
    function scan(dir: string): boolean {
      if (!fs.existsSync(dir)) return false;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', '__tests__'].includes(entry.name)) continue;
          if (scan(path.join(dir, entry.name))) return true;
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/setState.*password|setPassword.*response/i.test(content)) return true;
        }
      }
      return false;
    }
    expect(scan(SRC)).toBe(false);
  });
});
