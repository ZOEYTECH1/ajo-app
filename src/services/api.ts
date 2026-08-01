import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAppStore';

// ─── Base URL ────────────────────────────────────────────────────────────────

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

// ─── Response interceptor — auto-refresh on 401 ──────────────────────────────

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
