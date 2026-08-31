/**
 * LAYER 5 — Error Handling Audit (Mobile — React Native / Jest)
 * Checks: error boundaries present, user-facing error messages in auth flows,
 * api.ts attaches userMessage for network/timeout errors, loading states.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 5.1  ERROR BOUNDARIES — React error boundary exists in the app
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.1 — Error boundaries: crash protection', () => {
  it('app/_layout.tsx contains an ErrorBoundary class component', () => {
    const layoutPath = path.join(APP, '_layout.tsx');
    expect(fs.existsSync(layoutPath)).toBe(true);
    const content = fs.readFileSync(layoutPath, 'utf8');
    expect(content).toMatch(/ErrorBoundary|getDerivedStateFromError|componentDidCatch/);
  });

  it('ErrorBoundary wraps the root component tree', () => {
    const layoutPath = path.join(APP, '_layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    // ErrorBoundary should wrap the QueryClientProvider or AppShell
    expect(content).toMatch(/<ErrorBoundary/);
  });

  it('ErrorBoundary renders a fallback UI on error (not a blank screen)', () => {
    const layoutPath = path.join(APP, '_layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    // Should show a message when crashed
    expect(content).toMatch(/App Crash|Something went wrong|error|crashed/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5.2  USER-FACING ERRORS — screens show friendly error messages
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.2 — User-facing errors: auth screens show messages', () => {
  it('AuthScreens.tsx exists (shared UI for login/register/forgot)', () => {
    expect(fs.existsSync(path.join(SRC, 'AuthScreens.tsx'))).toBe(true);
  });

  it('AuthScreens.tsx shows server errors to the user', () => {
    const authPath = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    expect(content).toMatch(/serverError|setServerError|Alert\.alert|ErrorBanner/i);
  });

  it('AuthScreens.tsx has field-level validation error display', () => {
    const authPath = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    expect(content).toMatch(/errors\[|setErrors|validationError/i);
  });

  it('ErrorBanner component exists for inline error display', () => {
    const bannerCandidates = [
      path.join(SRC, 'components', 'ErrorBanner.tsx'),
      path.join(SRC, 'components.tsx'),
      path.join(SRC, 'AuthScreens.tsx'),
    ];
    const found = bannerCandidates.some((f) => {
      if (!fs.existsSync(f)) return false;
      return fs.readFileSync(f, 'utf8').includes('ErrorBanner');
    });
    expect(found).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5.3  NETWORK ERRORS — api.ts attaches userMessage for non-2xx responses
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.3 — Network error messages: api.ts interceptor', () => {
  it('api.ts attaches userMessage for ECONNABORTED (timeout) errors', () => {
    const apiPath = path.join(SRC, 'services', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/ECONNABORTED/);
    expect(content).toMatch(/userMessage/);
    expect(content).toMatch(/timed out|timeout/i);
  });

  it('api.ts attaches userMessage when no response is received (offline)', () => {
    const apiPath = path.join(SRC, 'services', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/error\.response/);
    expect(content).toMatch(/internet|server|reach/i);
  });

  it('api.ts handles 429 Too Many Requests with a user-facing message', () => {
    const apiPath = path.join(SRC, 'services', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/429/);
    expect(content).toMatch(/Too many requests|rate.limit/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5.4  LOADING STATES — screens show spinners during async operations
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.4 — Loading states: auth and data screens', () => {
  it('AuthScreens.tsx manages a loading state for form submission', () => {
    const authPath = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    expect(content).toMatch(/loading|isLoading|setLoading/i);
  });

  it('home screen shows a loading indicator while fetching data', () => {
    const homePath = path.join(APP, 'home.tsx');
    if (!fs.existsSync(homePath)) return;
    const content = fs.readFileSync(homePath, 'utf8');
    expect(content).toMatch(/isLoading|loading|ActivityIndicator|Skeleton/i);
  });

  it('inventory dashboard shows a loading state', () => {
    const dashPath = path.join(APP, 'inventory', 'dashboard.tsx');
    if (!fs.existsSync(dashPath)) return;
    const content = fs.readFileSync(dashPath, 'utf8');
    expect(content).toMatch(/isLoading|loading|ActivityIndicator|Skeleton/i);
  });
});
