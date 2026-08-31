@AGENTS.md

# Ajo App — Claude Code Guide

## Stack

- React Native + Expo SDK 56 (managed workflow)
- Expo Router v4 (file-based routing under `app/`)
- TypeScript (strict mode)
- TanStack Query v5 for server state
- Zustand v5 for client state (persisted in expo-secure-store)
- NativeWind v4 for utility CSS (Tailwind for RN)
- Jest + jest-expo for testing

## Key conventions

- All API calls go through `src/services/api.ts` (Axios instance).
  Never call `fetch` or raw `axios` from screens.
- Service files live in `src/services/`. One file per domain
  (auth, group, inventory, thrift, billing, notification, push, user).
- Screens live in `app/` following Expo Router file-based routing.
- Shared UI components live in `src/components.tsx`.
- Auth store: `src/store/useAppStore.ts` — tokens stored in expo-secure-store.

## Environment variables

All env vars are prefixed `EXPO_PUBLIC_` and read via `process.env`.
Never put secrets in `EXPO_PUBLIC_` vars — they are bundled into the client.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Production backend base URL |
| `EXPO_PUBLIC_USE_LOCAL` | `true` to use local Django server |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (leave empty to disable) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In web client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Sign-In Android client ID |

## Before writing any code

Read the exact versioned Expo docs: https://docs.expo.dev/versions/v56.0.0/

Never install a package with `npm install` alone for Expo projects — use
`npx expo install <package>` so Expo picks the compatible version.

## Testing

Run tests with `npm test`. Each audit layer has a dedicated test file in
`__tests__/layer*.test.tsx`. Tests use static file analysis (fs.readFileSync)
rather than rendering components, so they run without a native environment.

## Error handling

- `src/crashLogger.ts` — global JS error handler, must be the first import in `app/_layout.tsx`.
- `src/sentry.ts` — Sentry integration, imported second in `app/_layout.tsx`. No-op when EXPO_PUBLIC_SENTRY_DSN is not set.
- API interceptor in `src/services/api.ts` handles 401 (token refresh) and 429 (exponential backoff).
