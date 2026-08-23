import api from './api';
import type { AjoUser } from '../store/useAppStore';

export const userService = {
  uploadProfilePhoto: async (uri: string, mimeType = 'image/jpeg'): Promise<{ profile_photo: string }> => {
    const form = new FormData();
    form.append('photo', { uri, name: 'profile.jpg', type: mimeType } as any);
    const res = await api.post('/api/auth/profile-photo/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateProfile: async (data: { first_name?: string; last_name?: string; phone_number?: string }): Promise<AjoUser> => {
    const res = await api.patch('/api/auth/me/', data);
    return res.data;
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/api/auth/me/');
  },

  changePassword: async (current_password: string, new_password: string): Promise<void> => {
    await api.post('/api/auth/change-password/', { current_password, new_password });
  },
};
