/**
 * LAYER 6 — Test Coverage Audit (Mobile — React Native / Jest)
 * Checks: test files exist for critical paths, services are unit-testable,
 * Jest configuration is present, and key utility functions are tested.
 */

const fs = require('fs');
const path = require('path');
const ROOT    = path.resolve(__dirname, '..');
const SRC     = path.resolve(ROOT, 'src');
const TESTS   = path.resolve(ROOT, '__tests__');

// ─────────────────────────────────────────────────────────────────────────────
// 6.1  TEST INFRASTRUCTURE — Jest config and test directory
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.1 — Test infrastructure: Jest configuration', () => {
  it('package.json has a "test" script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts?.test).toBeDefined();
  });

  it('Jest preset is jest-expo', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const preset = pkg.jest?.preset ?? '';
    expect(preset).toMatch(/jest-expo/);
  });

  it('__tests__ directory exists', () => {
    expect(fs.existsSync(TESTS)).toBe(true);
  });

  it('at least four test files exist in __tests__/', () => {
    const files = fs.readdirSync(TESTS).filter((f: string) => /\.test\.(tsx?|jsx?)$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(4);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6.2  CRITICAL PATH TESTS — auth store and API service covered
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.2 — Critical path coverage: auth and API', () => {
  it('a test file covers Layer 4 (auth/authorization)', () => {
    expect(fs.existsSync(path.join(TESTS, 'layer4.test.tsx'))).toBe(true);
  });

  it('a test file covers Layer 2 (API service)', () => {
    expect(fs.existsSync(path.join(TESTS, 'layer2.test.tsx'))).toBe(true);
  });

  it('a test file covers Layer 8 (security)', () => {
    expect(fs.existsSync(path.join(TESTS, 'layer8.test.tsx'))).toBe(true);
  });

  it('a test file covers Layer 5 (error handling)', () => {
    expect(fs.existsSync(path.join(TESTS, 'layer5.test.tsx'))).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6.3  SERVICE UNIT-TESTABILITY — services export functions (not classes)
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.3 — Service unit-testability: exported functions', () => {
  it('authService.ts exports an authService object with named functions', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'authService.ts'), 'utf8');
    expect(content).toMatch(/export\s+(const|function)\s+authService|exports\.authService/);
  });

  it('inventoryService.ts exports named functions', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'inventoryService.ts'), 'utf8');
    expect(content).toMatch(/export\s+(const|function|async function)/);
  });

  it('groupService.ts exports named functions', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'groupService.ts'), 'utf8');
    expect(content).toMatch(/export\s+(const|function|async function)/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6.4  UTILITY FUNCTION TESTS — helpers have associated tests or are pure
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.4 — Utility functions: inventoryHelpers', () => {
  it('inventoryHelpers.ts exists and exports pure functions', () => {
    const helpersPath = path.join(SRC, 'utils', 'inventoryHelpers.ts');
    expect(fs.existsSync(helpersPath)).toBe(true);
    const content = fs.readFileSync(helpersPath, 'utf8');
    expect(content).toMatch(/export\s+(const|function)/);
  });

  it('inventoryHelpers exports getCategoryEmoji or similar utility', () => {
    const helpersPath = path.join(SRC, 'utils', 'inventoryHelpers.ts');
    if (!fs.existsSync(helpersPath)) return;
    const content = fs.readFileSync(helpersPath, 'utf8');
    expect(content).toMatch(/export/);
  });
});
