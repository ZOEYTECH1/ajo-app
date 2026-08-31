/**
 * LAYER 13 — Documentation Audit (Mobile — React Native / Jest)
 * Checks: JSDoc on service functions, README exists and is non-empty,
 * CLAUDE.md and AGENTS.md present, environment variable documentation.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');

// ─────────────────────────────────────────────────────────────────────────────
// 13.1  JSDOC — service functions documented
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.1 — JSDoc: service functions documented', () => {
  it('authService.ts has JSDoc comments (/** ... */)', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'authService.ts'), 'utf8');
    expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);
  });

  it('authService.ts has @param or @returns JSDoc tags', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'authService.ts'), 'utf8');
    expect(content).toMatch(/@param|@returns/);
  });

  it('api.ts has JSDoc comments on key functions', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);
  });

  it('src/sentry.ts exports are documented with JSDoc', () => {
    const content = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);
    expect(content).toMatch(/@param|@returns/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.2  README — project README exists and has content
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.2 — README: project documentation file', () => {
  it('README.md exists at the project root', () => {
    const readmePath = path.join(ROOT, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  it('README.md has meaningful content (more than 100 characters)', () => {
    const readmePath = path.join(ROOT, 'README.md');
    if (!fs.existsSync(readmePath)) return;
    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content.length).toBeGreaterThan(100);
  });

  it('README.md mentions environment variables or setup instructions', () => {
    const readmePath = path.join(ROOT, 'README.md');
    if (!fs.existsSync(readmePath)) return;
    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toMatch(/env|EXPO_PUBLIC|setup|install|npm/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.3  AGENT DOCS — CLAUDE.md and AGENTS.md guide AI assistants
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.3 — Agent documentation: CLAUDE.md and AGENTS.md', () => {
  it('CLAUDE.md exists at project root', () => {
    expect(fs.existsSync(path.join(ROOT, 'CLAUDE.md'))).toBe(true);
  });

  it('AGENTS.md exists at project root', () => {
    expect(fs.existsSync(path.join(ROOT, 'AGENTS.md'))).toBe(true);
  });

  it('CLAUDE.md has more than 200 characters of content', () => {
    const claudePath = path.join(ROOT, 'CLAUDE.md');
    if (!fs.existsSync(claudePath)) return;
    const content = fs.readFileSync(claudePath, 'utf8');
    expect(content.length).toBeGreaterThan(200);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.4  ENV VAR DOCUMENTATION — env vars named and described
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.4 — Environment variable documentation', () => {
  it('EXPO_PUBLIC_API_URL is referenced in source code', () => {
    const apiContent = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(apiContent).toMatch(/EXPO_PUBLIC_API_URL/);
  });

  it('EXPO_PUBLIC_SENTRY_DSN is referenced in sentry.ts', () => {
    const sentryContent = fs.readFileSync(path.join(SRC, 'sentry.ts'), 'utf8');
    expect(sentryContent).toMatch(/EXPO_PUBLIC_SENTRY_DSN/);
  });

  it('README.md or CLAUDE.md documents required environment variables', () => {
    const candidates = [
      path.join(ROOT, 'README.md'),
      path.join(ROOT, 'CLAUDE.md'),
    ];
    const found = candidates.some((f) => {
      if (!fs.existsSync(f)) return false;
      return fs.readFileSync(f, 'utf8').match(/EXPO_PUBLIC_|env|environment variable/i);
    });
    expect(found).toBe(true);
  });
});
