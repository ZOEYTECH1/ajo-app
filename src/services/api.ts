import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAppStore';

// ─── Base URL ────────────────────────────────────────────────────────────────

/**
 * Resolves the API base URL from environment variables or the Metro bundler
 * host, allowing physical devices to reach the local Django dev server.
 */
const getBaseUrl = (): string => {
  const useLocal = process.env.EXPO_PUBLIC_USE_LOCAL === 'true';
  const remoteUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!useLocal && remoteUrl) {
    return remoteUrl;
  }

  // Auto-detect the LAN IP Metro is serving from so physical devices can reach
  // the Django dev server running on the same machine.
  const fallback = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  const metroHost = Constants.expoConfig?.hostUri?.split(':').shift();
  const host = metroHost ?? fallback;
  return `http://${host}:8000`;
};

// ─── Axios instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach access token ───────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Exponential backoff helper ───────────────────────────────────────────────

/**
 * Retries a failed request with exponential backoff when the server responds
 * with HTTP 429 Too Many Requests.
 *
 * @param config   - The original Axios request config to retry.
 * @param attempt  - The current retry attempt number (1-based).
 * @param maxRetries - Maximum number of retry attempts before giving up.
 * @param retryAfterMs - Optional Retry-After value from the response header (ms).
 * @returns The Axios response on success, or rejects after max retries.
 */
const retryWithBackoff = (
  config: any,
  attempt: number,
  maxRetries: number,
  retryAfterMs?: number,
): Promise<any> => {
  if (attempt > maxRetries) {
    const err: any = new Error('Too many requests. Please wait a moment and try again.');
    err.userMessage = 'We\'re receiving too many requests right now. Please try again in a moment.';
    err.code = 'RATE_LIMITED';
    return Promise.reject(err);
  }

  // Honour the server's Retry-After header when present; otherwise back off exponentially.
  const backoffMs = retryAfterMs ?? Math.min(1000 * Math.pow(2, attempt - 1), 30000);

  return new Promise((resolve) => setTimeout(resolve, backoffMs)).then(() =>
    api(config),
  );
};

// ─── Response interceptor — auto-refresh on 401, backoff on 429 ─────────────

let isRefreshing = false;
type Resolver = { resolve: (token: string) => void; reject: (err: unknown) => void };
let waitQueue: Resolver[] = [];

const drainQueue = (error: unknown, token: string | null) => {
  waitQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  waitQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Attach a human-readable message for timeout and no-network failures
    // so screens can show it without inspecting low-level error internals.
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Request timed out. Check your connection and try again.';
    } else if (!error.response) {
      error.userMessage = 'Could not reach the server. Check your internet connection.';
    }

    const original = error.config;

    // ── 429 Too Many Requests — retry with exponential backoff ───────────────
    if (error.response?.status === 429) {
      const retryCount: number = (original._429retryCount ?? 0) + 1;
      original._429retryCount = retryCount;

      // Parse Retry-After header (seconds → ms), if the server provides it.
      const retryAfterHeader = error.response.headers?.['retry-after'];
      const retryAfterMs = retryAfterHeader
        ? parseFloat(retryAfterHeader) * 1000
        : undefined;

      error.userMessage = 'Too many requests. Please wait a moment and try again.';
      return retryWithBackoff(original, retryCount, 5, retryAfterMs);
    }

    // ── 401 Unauthorized — refresh the access token ──────────────────────────

    // Only attempt refresh for 401 on non-refresh endpoints and only once
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/api/auth/token/refresh/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue callers while a refresh is in flight
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      // Use bare axios so this request doesn't re-enter the interceptor
      const { data } = await axios.post(
        `${api.defaults.baseURL}/api/auth/token/refresh/`,
        { refresh: refreshToken },
      );
      const newAccess: string = data.access;
      useAuthStore.getState().setTokens(newAccess, refreshToken);
      drainQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
