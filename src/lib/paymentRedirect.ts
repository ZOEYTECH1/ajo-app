import { makeRedirectUri } from 'expo-auth-session';

/**
 * Every payment screen (Ajo Group, Inventory, Thrift billing) used to hand
 * WebBrowser.openAuthSessionAsync a hardcoded 'ajo://payment/verify' literal.
 * That's correct in a standalone/dev build -- the app really does own that
 * scheme there -- but Expo Go can't register an arbitrary app's custom
 * scheme for itself, so the redirect Flutterwave sends never reaches the
 * running JS and the auth session just hangs. This is the exact same class
 * of problem AuthScreens.tsx already solved for Google sign-in with
 * makeRedirectUri(): in a real build it still resolves to the same
 * ajo://payment/verify deep link, but in Expo Go it resolves to an
 * https://auth.expo.io/... proxy URL Expo Go can actually intercept.
 *
 * The backend only uses this when it's explicitly passed as `redirect_url`
 * (see _resolve_redirect_url, core/views.py) -- and only accepts http(s),
 * so the standalone-build case (a bare ajo:// URI) is safely ignored
 * server-side and falls back to its own identical default, while the
 * Expo Go case (an https:// proxy URL) actually gets used and fixes the
 * callback.
 */
export function getPaymentRedirectUri(): string {
  return makeRedirectUri({ scheme: 'ajo', path: 'payment/verify' });
}
