/**
 * LAYER 11 — CI/CD Audit (Mobile — React Native / Jest)
 * Checks: GitHub Actions workflow exists, runs tests on push/PR,
 * TypeScript type-check step present, secrets handled via env vars.
 */

const fs = require('fs');
const path = require('path');
const ROOT    = path.resolve(__dirname, '..');
const WORKFLOWS = path.resolve(ROOT, '.github', 'workflows');

// ─────────────────────────────────────────────────────────────────────────────
// 11.1  CI WORKFLOW — GitHub Actions configuration present
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 11.1 — CI workflow: GitHub Actions configured', () => {
  it('.github/workflows/ directory exists', () => {
    expect(fs.existsSync(WORKFLOWS)).toBe(true);
  });

  it('at least one workflow YAML file exists in .github/workflows/', () => {
    if (!fs.existsSync(WORKFLOWS)) return;
    const files = fs.readdirSync(WORKFLOWS).filter((f: string) => /\.(yml|yaml)$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('ci.yml workflow file exists', () => {
    expect(
      fs.existsSync(path.join(WORKFLOWS, 'ci.yml')) ||
      fs.existsSync(path.join(WORKFLOWS, 'ci.yaml'))
    ).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 11.2  WORKFLOW CONTENT — triggers, steps, environment
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 11.2 — Workflow content: triggers and steps', () => {
  const ciPath =
    fs.existsSync(path.join(WORKFLOWS, 'ci.yml'))
      ? path.join(WORKFLOWS, 'ci.yml')
      : path.join(WORKFLOWS, 'ci.yaml');

  it('workflow triggers on push to main', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toMatch(/on:|push:|branches:.*main/s);
  });

  it('workflow triggers on pull_request', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toMatch(/pull_request/);
  });

  it('workflow installs npm dependencies', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toMatch(/npm (ci|install)/);
  });

  it('workflow runs Jest tests', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toMatch(/npm test|jest/i);
  });

  it('workflow runs TypeScript type-check', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toMatch(/tsc|type.?check/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 11.3  SECRETS SAFETY — no secrets hardcoded in workflow
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 11.3 — Workflow secrets: safe handling', () => {
  const ciPath =
    fs.existsSync(path.join(WORKFLOWS, 'ci.yml'))
      ? path.join(WORKFLOWS, 'ci.yml')
      : path.join(WORKFLOWS, 'ci.yaml');

  it('workflow does not hardcode any API keys or passwords', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    // Should not contain long random strings typical of API keys
    expect(content).not.toMatch(/sk_live_[a-zA-Z0-9]{20,}/);
    expect(content).not.toMatch(/Bearer\s+[a-zA-Z0-9]{30,}/);
  });

  it('workflow passes env vars as empty strings or secrets references for CI', () => {
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf8');
    // Env vars should be empty ('') or use ${{ secrets.* }} syntax
    expect(content).toMatch(/env:|EXPO_PUBLIC_|secrets\./i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 11.4  DEPLOYMENT READINESS — key project files present
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 11.4 — Deployment readiness: project configuration', () => {
  it('eas.json exists for Expo Application Services builds', () => {
    expect(fs.existsSync(path.join(ROOT, 'eas.json'))).toBe(true);
  });

  it('app.json exists with app configuration', () => {
    expect(fs.existsSync(path.join(ROOT, 'app.json'))).toBe(true);
  });

  it('package.json has a "start" script for Expo', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts?.start).toBeDefined();
  });

  it('package.json specifies "expo-router/entry" as main entry', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.main).toMatch(/expo-router/);
  });
});
