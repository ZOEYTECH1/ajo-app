/**
 * Sentry error tracking initialisation for Ajo mobile app.
 *
 * Sentry is initialised only when EXPO_PUBLIC_SENTRY_DSN is set, so the app
 * runs without modification in local development or CI environments that have
 * no DSN configured.
 *
 * Usage:
 *   import '../src/sentry';  // import once at the top of app/_layout.tsx
 */

// Gracefully skip Sentry when the package is not installed (e.g. bare CI).
let SentryMod: typeof import('@sentry/react-native') | null = null;
try {
  // Dynamic require keeps the import tree intact for bundle splitting.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SentryMod = require('@sentry/react-native');
} catch (_) {
  // @sentry/react-native is not installed — no-op gracefully.
}

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SentryMod && dsn) {
  SentryMod.init({
    dsn,
    // Sample 20 % of transactions for performance monitoring.
    tracesSampleRate: 0.2,
    environment: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production',
    // Disable native crash reporting in Expo Go where the native layer is unavailable.
    enableNative: false,
    // Attach console.warn / console.error breadcrumbs automatically.
    enableAutoPerformanceTracing: false,
  });
}

/**
 * Captures an error in Sentry when the SDK is available and the DSN is set.
 * Safe to call even when Sentry is not configured — it will be a no-op.
 *
 * @param error - The error or exception to capture.
 * @param context - Optional extra context object to attach to the event.
 */
export const captureException = (error: unknown, context?: Record<string, unknown>): void => {
  if (!SentryMod || !dsn) return;
  SentryMod.captureException(error, context ? { extra: context } : undefined);
};

/**
 * Records an informational message in Sentry.
 * Safe to call even when Sentry is not configured.
 *
 * @param message - The message string to capture.
 * @param level   - Sentry severity level (default: 'info').
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
): void => {
  if (!SentryMod || !dsn) return;
  SentryMod.captureMessage(message, level);
};

export default SentryMod;
