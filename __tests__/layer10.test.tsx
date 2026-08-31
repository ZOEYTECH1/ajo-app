/**
 * LAYER 10 — Observability Audit (Mobile — React Native / Jest)
 * Checks: Sentry integration present, crashLogger installed, error tracking
 * initialised with env var DSN, graceful no-op when DSN is missing.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 10.1  SENTRY INTEGRATION — package installed and configured
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 10.1 — Sentry integration: SDK configured', () => {
  it('@sentry/react-native is listed in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps['@sentry/react-native']).toBeDefined();
  });

  it('src/sentry.ts exists (Sentry initialisation module)', () => {
    expect(fs.existsSync(path.join(SRC, 'sentry.ts'))).toBe(true);
  });

  it('sentry.ts reads DSN from EXPO_PUBLIC_SENTRY_DSN env var', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    expect(content).toMatch(/EXPO_PUBLIC_SENTRY_DSN/);
    expect(content).toMatch(/process\.env/);
  });

  it('sentry.ts only initialises Sentry when DSN is set (graceful no-op)', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    // Should conditionally init only when dsn is truthy
    expect(content).toMatch(/if\s*\(\s*(SentryMod &&\s*)?dsn\s*\)/);
  });

  it('sentry.ts calls Sentry.init with the DSN', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    expect(content).toMatch(/\.init\s*\(/);
    expect(content).toMatch(/dsn/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 10.2  CRASH LOGGER — global error handler is installed
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 10.2 — Crash logger: global error handler', () => {
  it('src/crashLogger.ts exists', () => {
    expect(fs.existsSync(path.join(SRC, 'crashLogger.ts'))).toBe(true);
  });

  it('crashLogger.ts hooks into the global ErrorUtils handler', () => {
    const content = fs.readFileSync(path.join(SRC, 'crashLogger.ts'), 'utf8');
    expect(content).toMatch(/ErrorUtils|setGlobalHandler|globalHandler/i);
  });

  it('app/_layout.tsx imports crashLogger as the first import', () => {
    const content = fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8');
    // crashLogger must be the very first import in the file
    const firstImportMatch = content.match(/^import[^\n]+/m);
    expect(firstImportMatch?.[0]).toMatch(/crashLogger/);
  });

  it('app/_layout.tsx imports sentry.ts for error tracking', () => {
    const content = fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8');
    expect(content).toMatch(/import.*sentry/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 10.3  EXPORTED HELPERS — captureException is accessible to screens
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 10.3 — Observability helpers: exported capture functions', () => {
  it('sentry.ts exports a captureException helper', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    expect(content).toMatch(/export\s+(const|function)\s+captureException/);
  });

  it('sentry.ts exports a captureMessage helper', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    expect(content).toMatch(/export\s+(const|function)\s+captureMessage/);
  });

  it('captureException is a no-op when DSN is not set', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    // Should guard with dsn check before capturing
    expect(content).toMatch(/if\s*\(!SentryMod\s*\|\|\s*!dsn\)\s*return/);
  });
});
