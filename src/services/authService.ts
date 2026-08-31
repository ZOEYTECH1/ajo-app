/**
 * @module authService
 * Authentication service for the Ajo mobile app.
 *
 * All functions communicate with the Django backend auth API and propagate
 * errors to the caller so screens can display user-friendly messages.
 * JWT tokens are stored in the Zustand auth store backed by expo-secure-store.
 */

import api from './api';
import { useAuthStore, type AjoUser } from '../store/useAppStore';

// ─── Payload types ────────────────────────────────────────────────────────────

/** Registration payload sent to the /api/auth/register/ endpoint. */
export interface RegisterPayload {
  email: string;
  phone_number: string;
  password: string;
  first_name: string;
  last_name: string;
  device_id?: string;
}

/** Login payload sent to the /api/auth/login/ endpoint. */
export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Auth service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Step 1 of registration — creates the account and triggers an email OTP.
   * No JWT token is returned at this stage.
   *
   * @param data - Registration form data.
   * @returns A message confirming the OTP was sent.
   */
  register: async (data: RegisterPayload): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/register/', data);
    return res.data;
  },

  /**
   * Verifies the email one-time password sent during registration.
   *
   * @param email - The registering user's email address.
   * @param code  - The 6-digit OTP received by email.
   * @returns A message confirming successful verification.
   */
  verifyEmail: async (email: string, code: string): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/verify-email/', { email, code });
    return res.data;
  },

  /**
   * Verifies a forgot-password OTP and returns short-lived JWT tokens that can
   * be used with {@link resetPassword}. No existing authentication is required.
   *
   * @param email - The account email address.
   * @param code  - The OTP received by email.
   * @returns JWT access/refresh tokens and the user profile.
   */
  forgotPasswordVerify: async (email: string, code: string): Promise<{ access: string; refresh: string; user: AjoUser }> => {
    const res = await api.post('/api/auth/forgot-password/verify/', { email, code });
    return res.data;
  },

  /**
   * Sets a new password using the short-lived access token from
   * {@link forgotPasswordVerify}. The token is passed explicitly rather than
   * read from the store because the user is not yet fully authenticated.
   *
   * @param newPassword  - The desired new password.
   * @param accessToken  - The temporary access token from forgotPasswordVerify.
   */
  resetPassword: async (newPassword: string, accessToken: string): Promise<void> => {
    await api.post('/api/auth/reset-password/', { new_password: newPassword }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  /**
   * Verifies the phone one-time password sent during onboarding.
   *
   * @param email - The user's email address.
   * @param code  - The 6-digit OTP received via SMS.
   * @returns A message confirming successful verification.
   */
  verifyPhone: async (email: string, code: string): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/verify-phone/', { email, code });
    return res.data;
  },

  /**
   * Re-sends an email or phone OTP. Useful when the original code expires.
   *
   * @param email - The account's email address.
   * @param type  - Whether to re-send to 'email' or 'phone'.
   * @returns A message confirming the OTP was resent.
   */
  resendOtp: async (email: string, type: 'email' | 'phone'): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/resend-otp/', { email, type });
    return res.data;
  },

  /**
   * Authenticates a user with email and password.
   * Stores the returned JWT tokens and user profile in the auth store.
   *
   * @param data - Login credentials.
   * @returns JWT access/refresh tokens and the full user profile.
   */
  login: async (data: LoginPayload): Promise<{ access: string; refresh: string; user: AjoUser }> => {
    const res = await api.post('/api/auth/login/', data);
    const { access, refresh, user } = res.data;
    useAuthStore.getState().setAuth(user, access, refresh);
    return res.data;
  },

  /**
   * Authenticates using a Google ID token obtained from expo-auth-session.
   * Stores the returned JWT tokens and user profile in the auth store.
   *
   * @param idToken - The Google ID token string.
   * @returns JWT access/refresh tokens and the full user profile.
   */
  googleSignIn: async (idToken: string): Promise<{ access: string; refresh: string; user: AjoUser }> => {
    const res = await api.post('/api/auth/google/', { id_token: idToken });
    const { access, refresh, user } = res.data;
    useAuthStore.getState().setAuth(user, access, refresh);
    return res.data;
  },

  /**
   * Registers a phone number for the authenticated user and triggers an OTP.
   *
   * @param phone_number - E.164-formatted phone number (e.g. +2348012345678).
   * @returns A detail message confirming the OTP was sent.
   */
  setPhone: async (phone_number: string): Promise<{ detail: string }> => {
    const res = await api.post('/api/auth/set-phone/', { phone_number });
    return res.data;
  },

  /**
   * Fetches the authenticated user's profile from the server and updates the
   * auth store.
   *
   * @returns The current user's full profile object.
   */
  getMe: async (): Promise<AjoUser> => {
    const res = await api.get('/api/auth/me/');
    useAuthStore.getState().updateUser(res.data);
    return res.data;
  },

  /**
   * Updates the Firebase Cloud Messaging token on the user's server profile
   * so push notifications can be delivered to the current device.
   *
   * @param fcm_token - The FCM token string from expo-notifications.
   * @returns The updated user profile.
   */
  updateFcmToken: async (fcm_token: string): Promise<AjoUser> => {
    const res = await api.patch('/api/auth/me/', { fcm_token });
    return res.data;
  },

  /**
   * Logs the current user out by clearing the auth store.
   * Tokens are removed from secure storage by the store's logout action.
   */
  logout: () => {
    useAuthStore.getState().logout();
  },
};
