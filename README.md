# Ajo App — Mobile (React Native / Expo)

The Ajo mobile application is built with React Native, Expo Router, TypeScript,
TanStack Query, and Zustand. It provides the Ajo, Thrift, and Inventory modules
to users on iOS and Android.

## Requirements

- Node.js 20+
- npm 10+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`

## Setup

```bash
# Clone the repository
git clone https://github.com/ZOEYTECH1/ajo-app.git
cd ajo-app

# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env
```

## Environment Variables

Create a `.env` file at the project root (never commit this file):

| Variable | Description | Required |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL (e.g. `https://api.ajo.com`) | Yes (production) |
| `EXPO_PUBLIC_USE_LOCAL` | Set to `true` to point the API client at your local Django server | No |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking. Leave empty to disable Sentry. | No |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID for Google Sign-In | No |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID | No |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID | No |
| `GOOGLE_SERVICES_JSON_BASE64` | Base64-encoded `google-services.json` for EAS builds | EAS only |

> All `EXPO_PUBLIC_` variables are embedded into the client bundle at build time.
> Do **not** put secrets in `EXPO_PUBLIC_` variables — they are visible to users.

## Running locally

```bash
# Start Metro bundler (Expo Go on your phone or emulator)
npm start

# Android emulator
npm run android

# iOS simulator (macOS only)
npm run ios
```

## Running tests

```bash
npm test
```

## Building for production (EAS)

```bash
# Configure EAS (first time only)
eas build:configure

# Android build
eas build --platform android

# iOS build
eas build --platform ios
```

## Project Structure

```
ajo-app/
├── app/                  # Expo Router screens (file-based routing)
│   ├── _layout.tsx       # Root layout — error boundary, auth guard, tab bar
│   ├── home.tsx          # Home dashboard
│   ├── group/            # Ajo group screens
│   ├── thrift/           # Thrift screens
│   └── inventory/        # Inventory management screens
├── src/
│   ├── services/         # API service modules (one per domain)
│   │   ├── api.ts        # Axios instance with auth interceptors and 429 backoff
│   │   ├── authService.ts
│   │   ├── groupService.ts
│   │   ├── inventoryService.ts
│   │   └── ...
│   ├── store/            # Zustand stores (persisted in expo-secure-store)
│   ├── components.tsx    # Shared UI components (Button, Input, Skeleton, …)
│   ├── AuthScreens.tsx   # Login, Register, OTP, Forgot Password screens
│   ├── crashLogger.ts    # Global JS error handler (must import first)
│   └── sentry.ts         # Sentry error tracking (no-op when DSN is unset)
├── __tests__/            # Jest test suites (one per audit layer)
└── .github/workflows/    # GitHub Actions CI (type-check + tests on every PR)
```

## Error Tracking

Sentry is configured via `EXPO_PUBLIC_SENTRY_DSN`. When the variable is absent
(local development, CI), Sentry is silently disabled — the app functions
normally without it. Set the variable in your EAS Secrets or `.env` file for
production builds.

## CI/CD

Every push and pull request runs the GitHub Actions workflow at
`.github/workflows/ci.yml`, which:

1. Installs dependencies with `npm ci`
2. Type-checks with `npx tsc --noEmit`
3. Runs the full Jest test suite

Merging to `main` is only allowed when all CI checks pass.
