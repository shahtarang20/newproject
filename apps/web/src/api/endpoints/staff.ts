import { api } from '../client';
import type { StaffRole } from '@vastra/shared';
import type { InviteStaffInput, StaffDto, StaffPermissionsDto } from '@/types/settings';

export const staffApi = {
  list: async () => (await api.get<StaffDto[]>('/staff')).data,
  permissions: async () => (await api.get<StaffPermissionsDto>('/staff/permissions')).data,
  invite: async (input: InviteStaffInput) => (await api.post<StaffDto>('/staff/invite', input)).data,
  resendInvite: async (id: string) => (await api.post<{ sent: boolean }>(`/staff/${id}/resend-invite`)).data,
  update: async (id: string, input: { role?: StaffRole; active?: boolean }) => (await api.patch<StaffDto>(`/staff/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/staff/${id}`);
  },
  acceptInvite: async (token: string, password: string) =>
    (await api.post<{ email: string }>('/staff/accept-invite', { token, password })).data,
};
