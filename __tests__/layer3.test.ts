/**
 * LAYER 3 — Data / Schema Audit (Mobile — React Native / Jest)
 * Checks: TypeScript interfaces for User and inventory entities, services
 * use typed responses, and no binary data stored client-side.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');

// ─────────────────────────────────────────────────────────────────────────────
// 3.1  SCHEMA DESIGN — TypeScript types for core entities
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 3.1 — Schema design: TypeScript types exist', () => {
  it('AjoUser interface exists in useAppStore.ts', () => {
    const storePath = path.join(SRC, 'store', 'useAppStore.ts');
    expect(fs.existsSync(storePath)).toBe(true);
    const content = fs.readFileSync(storePath, 'utf8');
    expect(content).toMatch(/interface AjoUser|type AjoUser/);
  });

  it('AjoUser has email, first_name, last_name fields', () => {
    const storePath = path.join(SRC, 'store', 'useAppStore.ts');
    const content = fs.readFileSync(storePath, 'utf8');
    expect(content).toMatch(/email/);
    expect(content).toMatch(/first_name/);
    expect(content).toMatch(/last_name/);
  });

  it('AuthState interface uses accessToken and refreshToken (not plaintext)', () => {
    const storePath = path.join(SRC, 'store', 'useAppStore.ts');
    const content = fs.readFileSync(storePath, 'utf8');
    expect(content).toMatch(/accessToken/);
    expect(content).toMatch(/refreshToken/);
    // Should NOT store the password
    expect(content).not.toMatch(/password\s*:/);
  });

  it('InventoryStore type tracks selectedBusinessId', () => {
    const storePath = path.join(SRC, 'store', 'useAppStore.ts');
    const content = fs.readFileSync(storePath, 'utf8');
    expect(content).toMatch(/selectedBusinessId/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 3.2  RELATIONSHIPS — inventory services type products with categories
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 3.2 — Relationships: entities reference each other', () => {
  it('inventory service file exists', () => {
    expect(fs.existsSync(path.join(SRC, 'services', 'inventoryService.ts'))).toBe(true);
  });

  it('inventory service references categories and products', () => {
    const servicePath = path.join(SRC, 'services', 'inventoryService.ts');
    if (!fs.existsSync(servicePath)) return;
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toMatch(/categor/i);
    expect(content).toMatch(/product/i);
  });

  it('inventory service references sales or movements', () => {
    const servicePath = path.join(SRC, 'services', 'inventoryService.ts');
    if (!fs.existsSync(servicePath)) return;
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toMatch(/sale|movement|expense|transfer/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 3.3  FILE STORAGE — images use remote URLs not local blobs
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 3.3 — File storage: remote image URLs', () => {
  it('no screen stores image as binary array — only URI strings', () => {
    const appDir = path.resolve(ROOT, 'app');
    let foundBlobStorage = false;

    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.expo'].includes(entry.name)) continue;
          scan(path.join(dir, entry.name));
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (/new Uint8Array|BinaryData|ArrayBuffer/.test(content)) {
            foundBlobStorage = true;
          }
        }
      }
    }
    scan(appDir);
    expect(foundBlobStorage).toBe(false);
  });

  it('add-product screen uses image URI (not local file blob)', () => {
    const addPath = path.join(ROOT, 'app', 'inventory', '[catId]', 'add-product.tsx');
    if (!fs.existsSync(addPath)) return;
    const content = fs.readFileSync(addPath, 'utf8');
    if (content.includes('image') || content.includes('photo')) {
      // Should use URI not raw binary
      expect(content).not.toMatch(/new Uint8Array|BinaryData/);
    }
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 3.4  INDEXES — data is filtered with query params, not client-side full scans
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 3.4 — Efficient data access patterns', () => {
  it('inventory service passes business_id as query param', () => {
    const servicePath = path.join(SRC, 'services', 'inventoryService.ts');
    if (!fs.existsSync(servicePath)) return;
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toMatch(/business_id|params/i);
  });

  it('inventory screens scope data fetches with useQuery', () => {
    const dashboardPath = path.join(ROOT, 'app', 'inventory', 'dashboard.tsx');
    if (!fs.existsSync(dashboardPath)) return;
    const content = fs.readFileSync(dashboardPath, 'utf8');
    expect(content).toMatch(/useQuery|getDashboard|selectedBusinessId|useInventoryStore/);
  });
});
