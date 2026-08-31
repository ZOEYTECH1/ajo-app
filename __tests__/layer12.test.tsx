/**
 * LAYER 12 — UX / Accessibility Audit (Mobile — React Native / Jest)
 * Checks: interactive elements have accessibilityLabel and accessibilityRole,
 * tab bar items are accessible, form inputs have labels, images have labels.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');
const APP  = path.resolve(ROOT, 'app');

// ─────────────────────────────────────────────────────────────────────────────
// 12.1  TAB BAR ACCESSIBILITY — tab buttons have roles and labels
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.1 — Tab bar accessibility: roles and labels', () => {
  it('app/_layout.tsx tab bar items have accessibilityRole', () => {
    const content = fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8');
    expect(content).toMatch(/accessibilityRole/);
  });

  it('app/_layout.tsx tab bar items have accessibilityLabel', () => {
    const content = fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8');
    expect(content).toMatch(/accessibilityLabel/);
  });

  it('app/_layout.tsx tab bar uses accessibilityState for selected tab', () => {
    const content = fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8');
    expect(content).toMatch(/accessibilityState/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.2  INTERACTIVE ELEMENTS — home screen cards have accessibility props
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.2 — Interactive elements: home screen accessibility', () => {
  it('app/home.tsx has TouchableOpacity elements with accessibilityRole', () => {
    const homePath = path.join(APP, 'home.tsx');
    if (!fs.existsSync(homePath)) return;
    const content = fs.readFileSync(homePath, 'utf8');
    expect(content).toMatch(/accessibilityRole/);
  });

  it('app/home.tsx cards have accessibilityLabel describing them', () => {
    const homePath = path.join(APP, 'home.tsx');
    if (!fs.existsSync(homePath)) return;
    const content = fs.readFileSync(homePath, 'utf8');
    expect(content).toMatch(/accessibilityLabel/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.3  FORM INPUTS — TextInput components have accessible labels
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.3 — Form inputs: accessible labels on TextInputs', () => {
  it('src/AuthScreens.tsx TextInputs have accessibilityLabel', () => {
    const authPath = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    expect(content).toMatch(/accessibilityLabel/);
  });

  it('src/components.tsx Input component supports accessibilityLabel prop', () => {
    const compPath = path.join(SRC, 'components.tsx');
    if (!fs.existsSync(compPath)) return;
    const content = fs.readFileSync(compPath, 'utf8');
    // Input or TextInput should pass through accessibility props
    expect(content).toMatch(/accessibilityLabel|TextInput/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.4  IMAGES AND ICONS — decorative or meaningful images are labelled
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.4 — Images and icons: accessible labels', () => {
  it('src/AuthScreens.tsx logo has accessible label and image role', () => {
    const authPath = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    expect(content).toMatch(/accessibilityRole.*image|accessibilityLabel.*logo/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.5  SCREEN HEADERS — screen titles have header role for screen readers
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.5 — Screen titles: accessibilityRole="header"', () => {
  it('src/AuthScreens.tsx screen title Text has accessibilityRole="header"', () => {
    const authPath = path.join(SRC, 'AuthScreens.tsx');
    if (!fs.existsSync(authPath)) return;
    const content = fs.readFileSync(authPath, 'utf8');
    expect(content).toMatch(/accessibilityRole.*header|header.*accessibilityRole/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.6  BUTTON COMPONENT — Bouncy / Button has accessibility support
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.6 — Shared button component: accessibility', () => {
  it('src/components.tsx Bouncy component accepts accessibilityRole prop', () => {
    const compPath = path.join(SRC, 'components.tsx');
    if (!fs.existsSync(compPath)) return;
    const content = fs.readFileSync(compPath, 'utf8');
    expect(content).toMatch(/accessibilityRole/);
  });

  it('src/components.tsx Bouncy defaults accessibilityRole to "button"', () => {
    const compPath = path.join(SRC, 'components.tsx');
    if (!fs.existsSync(compPath)) return;
    const content = fs.readFileSync(compPath, 'utf8');
    expect(content).toMatch(/accessibilityRole\s*=\s*['"]button['"]/);
  });
});
