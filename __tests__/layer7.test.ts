/**
 * LAYER 7 — CI/CD Audit (Mobile — React Native / Jest)
 * Toolkit: Jest + jest-expo + @testing-library/react-native (specified by Layer 7 for mobile)
 * Checks: test infrastructure is configured, test files exist for all layers,
 * no secrets in source, package.json has the right scripts.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.resolve(ROOT, '__tests__');

// ─────────────────────────────────────────────────────────────────────────────
// 7.1  TEST INFRASTRUCTURE — Jest + jest-expo configured
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.1 — Jest test infrastructure for mobile', () => {
  it('package.json has Jest configured with jest-expo preset', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const jestConfig = pkg.jest ?? {};
    expect(jestConfig.preset).toMatch(/jest-expo/);
  });

  it('@testing-library/react-native is in devDependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty('@testing-library/react-native');
  });

  it('jest-expo is in devDependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty('jest-expo');
  });

  it('__tests__ directory exists', () => {
    expect(fs.existsSync(TESTS_DIR)).toBe(true);
  });

  it('layer 1 test exists (frontend audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer1.test.tsx'))
    ).toBe(true);
  });

  it('layer 2 test exists (API audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer2.test.tsx'))
    ).toBe(true);
  });

  it('layer 3 test exists (data/schema audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer3.test.ts'))
    ).toBe(true);
  });

  it('layer 4 test exists (auth audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer4.test.tsx'))
    ).toBe(true);
  });

  it('layer 5 test exists (deployment audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer5.test.ts'))
    ).toBe(true);
  });

  it('layer 6 test exists (cloud/compute audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer6.test.ts'))
    ).toBe(true);
  });

  it('layer 8 test exists (security audit)', () => {
    expect(
      fs.existsSync(path.resolve(TESTS_DIR, 'layer8.test.tsx'))
    ).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 7.2  SECRETS — no credentials in committed source
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.2 — Secrets: no credentials in source code', () => {
  const SRC = path.resolve(ROOT, 'src');

  const SECRET_PATTERNS = [
    /sk_live_[a-zA-Z0-9]{20,}/,
    /AAAA[a-zA-Z0-9_-]{100,}/,
    /postgres:\/\/[^:]+:[^@]{6,}@/,
  ];

  function scanForSecrets(dir: string): string[] {
    const found: string[] = [];
    if (!fs.existsSync(dir)) return found;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (['node_modules', '.expo', 'ios', 'android'].includes(entry.name)) continue;
        found.push(...scanForSecrets(path.join(dir, entry.name)));
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(content)) {
              found.push(`${entry.name}: matches ${pattern}`);
            }
          }
        } catch { /* skip unreadable */ }
      }
    }
    return found;
  }

  it('no Stripe live keys in source', () => {
    const found = scanForSecrets(SRC).filter(f => f.includes('sk_live'));
    expect(found).toHaveLength(0);
  });

  it('no hardcoded database connection strings in source', () => {
    const found = scanForSecrets(SRC).filter(f => f.includes('postgres://'));
    expect(found).toHaveLength(0);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 7.3  DEPLOYMENT PIPELINE — package.json scripts
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.3 — Deployment pipeline scripts', () => {
  it('package.json has "test" script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts).toHaveProperty('test');
  });

  it('package.json has "start" or "android" / "ios" scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const hasDevScript =
      'start' in (pkg.scripts ?? {}) ||
      'android' in (pkg.scripts ?? {}) ||
      'ios' in (pkg.scripts ?? {});
    expect(hasDevScript).toBe(true);
  });

  it('TypeScript is a dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty('typescript');
  });

  it('tsconfig.json exists for type-safe builds', () => {
    expect(fs.existsSync(path.resolve(ROOT, 'tsconfig.json'))).toBe(true);
  });
});
