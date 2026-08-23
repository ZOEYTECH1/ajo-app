import api from './api';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  notif_type: string;
  action_data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  getNotifications: async (): Promise<{ data: AppNotification[]; unreadCount: number }> => {
    const res = await api.get('/api/notifications/');
    const unreadCount = parseInt(res.headers['x-unread-count'] ?? '0', 10);
    return { data: res.data.results ?? [], unreadCount };
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/api/notifications/', { params: { unread: 'true' } });
    return parseInt(res.headers['x-unread-count'] ?? '0', 10);
  },

  markRead: async (notifId: number): Promise<void> => {
    await api.post(`/api/notifications/${notifId}/read/`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/api/notifications/mark-all-read/');
  },
};
