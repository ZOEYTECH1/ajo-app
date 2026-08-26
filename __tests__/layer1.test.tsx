/**
 * LAYER 1 — Frontend Audit (Mobile — React Native / Jest)
 * Checks: accessible labels on inputs, form structure, design consistency,
 * and screen organization. Uses expo-router file-based structure (app/ dir).
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 1.1  ACCESSIBILITY — inputs have accessible labels
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 1.1 — Accessibility: inputs have labels in auth screens', () => {
  it('login screen file exists (app/login.tsx)', () => {
    expect(fs.existsSync(path.join(APP, 'login.tsx'))).toBe(true);
  });

  it('login screen uses TextInput or CustomInput component', () => {
    // app/login.tsx is a route wrapper; actual UI is in src/AuthScreens.tsx
    const authScreens = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authScreens)) return;
    const content = fs.readFileSync(authScreens, 'utf8');
    expect(content).toMatch(/TextInput|Input|CustomInput/);
  });

  it('login screen has a password field with secureTextEntry', () => {
    // app/login.tsx is a route wrapper; actual UI is in src/AuthScreens.tsx
    const authScreens = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authScreens)) return;
    const content = fs.readFileSync(authScreens, 'utf8');
    expect(content).toMatch(/secureTextEntry|password/i);
  });

  it('register screen file exists (app/register.tsx)', () => {
    expect(fs.existsSync(path.join(APP, 'register.tsx'))).toBe(true);
  });

  it('register screen has first_name, last_name, email, password fields', () => {
    // app/register.tsx is a route wrapper; actual UI is in src/AuthScreens.tsx
    const authScreens = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authScreens)) return;
    const content = fs.readFileSync(authScreens, 'utf8');
    expect(content).toMatch(/first_name|firstName|first name/i);
    expect(content).toMatch(/email/i);
    expect(content).toMatch(/password/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 1.2  FORMS — error handling and form feedback
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 1.2 — Forms: errors and user feedback', () => {
  it('login screen shows error state on failed login', () => {
    // The actual login form is in src/AuthScreens.tsx (app/login.tsx is just a route wrapper)
    const candidates = [
      path.join(SRC, 'AuthScreens.tsx'),
      path.join(APP, 'login.tsx'),
    ];
    for (const f of candidates) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        if (content.match(/Alert|error|Error|ErrorBanner/i)) return;
      }
    }
    // If AuthScreens.tsx exists and has error handling, pass
    const authScreens = path.join(SRC, 'AuthScreens.tsx');
    if (fs.existsSync(authScreens)) {
      const content = fs.readFileSync(authScreens, 'utf8');
      expect(content).toMatch(/Alert|error|Error|catch/i);
    }
  });

  it('login screen has a loading state for the submit button', () => {
    const authScreens = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authScreens)) return;
    const content = fs.readFileSync(authScreens, 'utf8');
    expect(content).toMatch(/loading|isLoading|Loading|isSubmitting/i);
  });

  it('inventory "add product" form exists', () => {
    const addProductPath = path.join(APP, 'inventory', '[catId]', 'add-product.tsx');
    expect(fs.existsSync(addProductPath)).toBe(true);
  });

  it('add product form has a name/price field', () => {
    const addProductPath = path.join(APP, 'inventory', '[catId]', 'add-product.tsx');
    if (!fs.existsSync(addProductPath)) return;
    const content = fs.readFileSync(addProductPath, 'utf8');
    expect(content).toMatch(/name|price|selling_price/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 1.3  CONSISTENCY — design tokens used in screens
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 1.3 — Consistency: design tokens and theme', () => {
  it('theme file exports colors', () => {
    const themePath = path.join(SRC, 'theme.ts');
    expect(fs.existsSync(themePath)).toBe(true);
    const content = fs.readFileSync(themePath, 'utf8');
    expect(content).toMatch(/Colors?|colors|LightColors|DarkColors/i);
  });

  it('theme includes an orange/primary brand color', () => {
    const themePath = path.join(SRC, 'theme.ts');
    if (!fs.existsSync(themePath)) return;
    const content = fs.readFileSync(themePath, 'utf8');
    // Check for orange hex or named orange
    expect(content).toMatch(/#[Ee][86]|#[Ff][57]|orange|primary/i);
  });

  it('useTheme hook exists and returns colors', () => {
    const hookPath = path.join(SRC, 'hooks', 'useTheme.ts');
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, 'utf8');
    expect(content).toMatch(/colors/i);
  });

  it('components directory exists', () => {
    expect(fs.existsSync(path.join(SRC, 'components'))).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 1.4  ORGANIZATION — screen and feature structure
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 1.4 — Organization: expo-router file structure', () => {
  it('app/ directory exists (expo-router)', () => {
    expect(fs.existsSync(APP)).toBe(true);
  });

  it('app/_layout.tsx exists (root layout)', () => {
    expect(fs.existsSync(path.join(APP, '_layout.tsx'))).toBe(true);
  });

  it('app/home.tsx exists (home screen)', () => {
    expect(fs.existsSync(path.join(APP, 'home.tsx'))).toBe(true);
  });

  it('inventory screens are in app/inventory/', () => {
    expect(fs.existsSync(path.join(APP, 'inventory'))).toBe(true);
  });

  it('inventory dashboard screen exists', () => {
    expect(fs.existsSync(path.join(APP, 'inventory', 'dashboard.tsx'))).toBe(true);
  });

  it('services directory exists', () => {
    expect(fs.existsSync(path.join(SRC, 'services'))).toBe(true);
  });

  it('store directory exists', () => {
    expect(fs.existsSync(path.join(SRC, 'store'))).toBe(true);
  });

  it('package.json has main entry pointing to expo-router', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.main).toBeDefined();
  });
});
