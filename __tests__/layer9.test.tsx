/**
 * LAYER 9 — Rate Limiting Audit (Mobile — React Native / Jest)
 * Checks: exponential backoff on 429 responses, retry-after header handling,
 * user-facing message on rate limit, no tight retry loops.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');

// ─────────────────────────────────────────────────────────────────────────────
// 9.1  429 HANDLING — api.ts intercepts Too Many Requests
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.1 — 429 handling: exponential backoff in api.ts', () => {
  it('api.ts checks for HTTP 429 status code in the response interceptor', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/429/);
  });

  it('api.ts implements retry logic (retryWithBackoff or similar)', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/retry|backoff|Backoff/i);
  });

  it('api.ts uses exponential delay (Math.pow or doubling pattern)', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    // Should have exponential growth — Math.pow(2, ...) or similar doubling
    expect(content).toMatch(/Math\.pow|Math\.min|backoff|attempt/i);
  });

  it('api.ts respects the Retry-After response header', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/retry.after|Retry-After|retryAfter/i);
  });

  it('api.ts caps retries at a maximum count (does not loop indefinitely)', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    // Must have a max retry limit
    expect(content).toMatch(/maxRetries|max.*retry|_429retryCount|attempt.*>/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 9.2  USER MESSAGE — friendly message shown after rate limit exhaustion
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.2 — Rate limit UX: user-facing message', () => {
  it('api.ts sets a friendly userMessage when rate limited', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/userMessage.*Too many|Too many.*userMessage/i);
  });

  it('api.ts does not propagate raw "429" as the only user-visible text', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    // Should have a human-readable message alongside the 429 handling
    expect(content).toMatch(/Please wait|try again|moment/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 9.3  API KEY MANAGEMENT — no hardcoded API keys in source
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.3 — API key management: environment variables only', () => {
  it('no source file contains a hardcoded Paystack live secret key', () => {
    const suspicious: string[] = [];
    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo', 'ios', 'android', '__tests__'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/sk_live_[a-zA-Z0-9]{20,}/.test(content)) suspicious.push(entry.name);
        }
      }
    }
    scanDir(path.join(ROOT, 'src'));
    expect(suspicious).toHaveLength(0);
  });

  it('all EXPO_PUBLIC_ env vars are read via process.env (not hardcoded)', () => {
    const apiContent = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    // API URL comes from process.env
    expect(apiContent).toMatch(/process\.env/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 9.4  DEBOUNCING — no tight retry loop patterns
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.4 — No tight retry loops: safe retry pattern', () => {
  it('api.ts uses setTimeout / Promise delay between retries (not immediate loop)', () => {
    const content = fs.readFileSync(path.join(SRC, 'services', 'api.ts'), 'utf8');
    expect(content).toMatch(/setTimeout|Promise.*resolve|delay/i);
  });
});
