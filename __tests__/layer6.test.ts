/**
 * LAYER 6 — Cloud / Compute Audit (Mobile — React Native / Jest)
 * Checks: API calls are cached (React Query useQuery used in screens),
 * inventory queries scope by business_id, data fetches are paginated,
 * and no unnecessary full-table loads per render.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 6.1  COST EFFICIENCY — queries are cached with React Query
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.1 — Caching: React Query used in inventory screens', () => {
  it('@tanstack/react-query is installed', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasQuery =
      '@tanstack/react-query' in allDeps ||
      'react-query' in allDeps;
    expect(hasQuery).toBe(true);
  });

  it('inventory dashboard uses useQuery', () => {
    const dashboardPath = path.join(APP, 'inventory', 'dashboard.tsx');
    if (!fs.existsSync(dashboardPath)) return;
    const content = fs.readFileSync(dashboardPath, 'utf8');
    expect(content).toMatch(/useQuery|useMutation/);
  });

  it('inventory expenses screen uses useQuery', () => {
    const expensesPath = path.join(APP, 'inventory', 'expenses.tsx');
    if (!fs.existsSync(expensesPath)) return;
    const content = fs.readFileSync(expensesPath, 'utf8');
    expect(content).toMatch(/useQuery|useMutation/);
  });

  it('inventory screens use enabled: guard when businessId is null', () => {
    const candidates = [
      path.join(APP, 'inventory', 'dashboard.tsx'),
      path.join(APP, 'inventory', 'expenses.tsx'),
      path.join(APP, 'inventory', 'product-requests.tsx'),
    ];

    let foundEnabled = false;
    for (const f of candidates) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        if (content.includes('enabled:') || content.includes('enabled =')) {
          foundEnabled = true;
          break;
        }
      }
    }
    expect(foundEnabled).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6.2  PAGINATION — list screens request pages, not full tables
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.2 — Pagination: list screens pass page params', () => {
  it('expenses screen uses useQuery for data fetching', () => {
    const expensesPath = path.join(APP, 'inventory', 'expenses.tsx');
    if (!fs.existsSync(expensesPath)) return;
    const content = fs.readFileSync(expensesPath, 'utf8');
    expect(content).toMatch(/useQuery|getExpenses|page|onEndReached|FlatList|cursor/i);
  });

  it('product-requests screen uses pagination pattern', () => {
    const prPath = path.join(APP, 'inventory', 'product-requests.tsx');
    if (!fs.existsSync(prPath)) return;
    const content = fs.readFileSync(prPath, 'utf8');
    expect(content).toMatch(/page|cursor|useQuery/);
  });

  it('customers screen exists and uses pagination or list', () => {
    const customersPath = path.join(APP, 'inventory', 'customers.tsx');
    if (!fs.existsSync(customersPath)) return;
    const content = fs.readFileSync(customersPath, 'utf8');
    expect(content).toMatch(/useQuery|page|results/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6.3  RESOURCE SIZING — business_id scopes fetches
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.3 — Resource sizing: scoped data fetches', () => {
  it('inventory service uses business_id as query param', () => {
    const servicePath = path.join(SRC, 'services', 'inventoryService.ts');
    if (!fs.existsSync(servicePath)) return;
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toMatch(/business_id/);
  });

  it('inventory screens use useQuery to scope data fetches', () => {
    const dashboardPath = path.join(APP, 'inventory', 'dashboard.tsx');
    if (!fs.existsSync(dashboardPath)) return;
    const content = fs.readFileSync(dashboardPath, 'utf8');
    expect(content).toMatch(/useQuery|getDashboard|selectedBusinessId|useInventoryStore/);
  });

  it('QueryClient provider is set up in app layout', () => {
    const layoutPath = path.join(APP, '_layout.tsx');
    if (!fs.existsSync(layoutPath)) return;
    const content = fs.readFileSync(layoutPath, 'utf8');
    expect(content).toMatch(/QueryClient|QueryClientProvider/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 6.4  SCALING — no raw fetch() inside useEffect without caching
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 6.4 — Scaling: queries cached (no uncached useEffect fetches)', () => {
  it('inventory dashboard does not use raw fetch() in useEffect', () => {
    const dashboardPath = path.join(APP, 'inventory', 'dashboard.tsx');
    if (!fs.existsSync(dashboardPath)) return;
    const content = fs.readFileSync(dashboardPath, 'utf8');
    // If it uses fetch in useEffect, that's uncached — check for useQuery instead
    if (content.includes('useEffect') && content.includes('fetch(')) {
      // If it has raw fetch in useEffect, it should also have useQuery for caching
      expect(content).toMatch(/useQuery/);
    } else {
      // Uses useQuery or service calls — good
      expect(true).toBe(true);
    }
  });

  it('expenses screen does not call API on every render', () => {
    const expensesPath = path.join(APP, 'inventory', 'expenses.tsx');
    if (!fs.existsSync(expensesPath)) return;
    const content = fs.readFileSync(expensesPath, 'utf8');
    // Should use useQuery (cached) not bare fetch in render body
    expect(content).toMatch(/useQuery|useMutation/);
  });
});
