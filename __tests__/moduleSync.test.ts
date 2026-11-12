/**
 * Account-level module sync — the user's chosen sections (Ajo/Thrift/
 * Inventory) must be consistent across ajo-app and ajo-web, not tracked
 * per-device. Static source checks (matching this project's existing
 * layer*.test.ts style) confirming the sync wiring is actually present,
 * since this is easy to silently regress by editing one side without the
 * other.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.resolve(ROOT, 'src');

describe('Module sync — authService pulls/pushes selected_modules', () => {
  const content = fs.readFileSync(path.join(SRC, 'services', 'authService.ts'), 'utf8');

  it('login pulls the account selected_modules into the local module store', () => {
    const loginFn = content.slice(content.indexOf('login: async'), content.indexOf('googleSignIn:'));
    expect(loginFn).toMatch(/syncFromAccount\(user\.selected_modules/);
  });

  it('googleSignIn pulls the account selected_modules into the local module store', () => {
    const fn = content.slice(content.indexOf('googleSignIn: async'), content.indexOf('setPhone:'));
    expect(fn).toMatch(/syncFromAccount\(user\.selected_modules/);
  });

  it('getMe pulls the account selected_modules into the local module store', () => {
    const fn = content.slice(content.indexOf('getMe: async'), content.indexOf('getMe: async') + 400);
    expect(fn).toMatch(/syncFromAccount\(res\.data\.selected_modules/);
  });

  it('exposes an updateSelectedModules function that PATCHes /auth/me/', () => {
    expect(content).toMatch(/updateSelectedModules:\s*async/);
    const fn = content.slice(content.indexOf('updateSelectedModules: async'));
    expect(fn).toMatch(/api\.patch\(['"]\/api\/auth\/me\/['"],\s*\{\s*selected_modules/);
  });
});

describe('Module sync — useModuleStore pushes changes to the account', () => {
  const content = fs.readFileSync(path.join(SRC, 'store', 'useAppStore.ts'), 'utf8');

  it('setSelectedModules pushes to the account, not just local state', () => {
    const fn = content.slice(content.indexOf('setSelectedModules: (modules, primary)'), content.indexOf('addModule: (module)'));
    expect(fn).toMatch(/pushSelectedModulesToAccount/);
  });

  it('addModule pushes to the account, not just local state', () => {
    const fn = content.slice(content.indexOf('addModule: (module)'), content.indexOf('syncFromAccount: (accountModules)'));
    expect(fn).toMatch(/pushSelectedModulesToAccount/);
  });

  it('syncFromAccount exists for pulling the account value on login', () => {
    expect(content).toMatch(/syncFromAccount:\s*\(accountModules\)/);
  });

  it('AjoUser carries selected_modules from the backend', () => {
    const iface = content.slice(content.indexOf('export interface AjoUser'), content.indexOf('interface AuthState'));
    expect(iface).toMatch(/selected_modules:\s*ModuleKey\[\]/);
  });
});
