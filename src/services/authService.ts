import api from './api';
import { useAuthStore, type AjoUser } from '../store/useAppStore';

// ─── Payload types ────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  phone_number: string;
  password: string;
  first_name: string;
  last_name: string;
  device_id?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Auth service ─────────────────────────────────────────────────────────────

export const authService = {
  // Step 1 — creates account, sends email OTP (no token returned yet)
  register: async (data: RegisterPayload): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/register/', data);
    return res.data;
  },

  verifyEmail: async (email: string, code: string): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/verify-email/', { email, code });
    return res.data;
  },

  // Verifies a forgot-password OTP and returns JWT tokens (no existing auth needed)
  forgotPasswordVerify: async (email: string, code: string): Promise<{ access: string; refresh: string; user: AjoUser }> => {
    const res = await api.post('/api/auth/forgot-password/verify/', { email, code });
    return res.data;
  },

  // Sets a new password using a short-lived token from forgotPasswordVerify
  resetPassword: async (newPassword: string, accessToken: string): Promise<void> => {
    await api.post('/api/auth/reset-password/', { new_password: newPassword }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  verifyPhone: async (email: string, code: string): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/verify-phone/', { email, code });
    return res.data;
  },

  resendOtp: async (email: string, type: 'email' | 'phone'): Promise<{ message: string }> => {
    const res = await api.post('/api/auth/resend-otp/', { email, type });
    return res.data;
  },

  // Returns JWT tokens + user profile; stores them in the auth store
  login: async (data: LoginPayload): Promise<{ access: string; refresh: string; user: AjoUser }> => {
    const res = await api.post('/api/auth/login/', data);
    const { access, refresh, user } = res.data;
    useAuthStore.getState().setAuth(user, access, refresh);
    return res.data;
  },

  googleSignIn: async (idToken: string): Promise<{ access: string; refresh: string; user: AjoUser }> => {
    const res = await api.post('/api/auth/google/', { id_token: idToken });
    const { access, refresh, user } = res.data;
    useAuthStore.getState().setAuth(user, access, refresh);
    return res.data;
  },

  setPhone: async (phone_number: string): Promise<{ detail: string }> => {
    const res = await api.post('/api/auth/set-phone/', { phone_number });
    return res.data;
  },

  getMe: async (): Promise<AjoUser> => {
    const res = await api.get('/api/auth/me/');
    useAuthStore.getState().updateUser(res.data);
    return res.data;
  },

  updateFcmToken: async (fcm_token: string): Promise<AjoUser> => {
    const res = await api.patch('/api/auth/me/', { fcm_token });
    return res.data;
  },

  logout: () => {
    useAuthStore.getState().logout();
  },
};
