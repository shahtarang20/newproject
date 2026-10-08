import { api } from '../client';
import type { PaginationMeta } from '@vastra/shared';
import type { NotificationList } from '@/types/settings';

export interface NotificationsQuery { page?: number; limit?: number; unread?: boolean }

export const notificationsApi = {
  list: async (params: NotificationsQuery = {}): Promise<{ data: NotificationList; meta?: PaginationMeta }> => {
    const res = await api.get<NotificationList>('/notifications', { params });
    return { data: res.data, meta: res.meta };
  },
  markRead: async (id: string) => (await api.patch<{ read: boolean }>(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await api.post<{ updated: number }>('/notifications/read-all')).data,
};
