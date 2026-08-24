import api from './api';
import type { AjoUser } from '../store/useAppStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThriftFrequency      = 'daily' | 'weekly' | 'monthly';
export type ThriftMemberStatus   = 'pending' | 'approved' | 'rejected' | 'amount_pending';
export type ThriftCycleType      = 'rolling' | 'fixed';
export type ThriftCycleStatus    = 'active' | 'completed';
export type ThriftPaymentStatus  = 'pending' | 'confirmed' | 'disputed';
export type OrgType              = 'bank' | 'mfb' | 'cooperative' | 'other';
export type OrgMemberRole        = 'admin' | 'collector';
export type OrgMemberStatus      = 'pending' | 'active' | 'suspended';
export type ReportStatus         = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ThriftOrganization {
  id: number;
  name: string;
  org_type: OrgType;
  logo: string | null;
  logo_url: string;
  registration_number: string;
  is_verified: boolean;
  is_platform_partner: boolean;
  owner: AjoUser | null;
  member_count: number;
  created_at: string;
}

export interface ThriftOrgMember {
  id: number;
  organization: ThriftOrganization;
  user: AjoUser;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  joined_at: string | null;
  created_at: string;
}

export interface ThriftCycle {
  id: number;
  cycle_number: number;
  start_date: string;
  end_date: string | null;
  status: ThriftCycleStatus;
  ended_at: string | null;
  created_at: string;
}

export interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  frequency: ThriftFrequency;
  cycle_type: ThriftCycleType;
  collector: AjoUser;
  organization: ThriftOrganization | null;
  invite_code: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expires: string | null;
  active_cycle: ThriftCycle | null;
  created_at: string;
  is_org_admin?: boolean;
}

export interface ThriftMember {
  id: number;
  user: AjoUser;
  group: ThriftGroup;
  personal_amount: string;
  status: ThriftMemberStatus;
  flag_reason: string;
  joined_at: string | null;
  total_saved: string;
  created_at: string;
}

export interface ThriftPayment {
  id: number;
  member: number;
  member_name: string;
  cycle_id: number | null;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  status: ThriftPaymentStatus;
  payer_confirmed: boolean;
  dispute_reason: string;
  disputed_at: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
}

export interface PaymentStats {
  total: number;
  confirmed: number;
  disputed: number;
  pending: number;
  total_collected: number;
  savings_mobilization: number;
}

export interface CollectorStats {
  mobilization_rate: number | null;
  dispute_rate: number | null;
  total_amount: number;
  confirmed_amount: number;
  total_count: number;
  disputed_count: number;
}

export interface CollectorReport {
  id: number;
  collector: AjoUser;
  reported_by: AjoUser;
  group: number;
  organization: ThriftOrganization | null;
  reason: string;
  status: ReportStatus;
  resolution_notes: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface QueueMember {
  id: number;
  user: AjoUser;
  group_id: number;
  group_name: string;
  personal_amount: string;
  status: ThriftMemberStatus;
  flag_reason: string;
  created_at: string;
}

export interface QueuePayment {
  id: number;
  member_id: number;
  member_name: string;
  group_id: number;
  group_name: string;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  dispute_reason: string;
  dispute_audio: string | null;
  disputed_at: string | null;
}

export interface CollectorQueue {
  pending_members: QueueMember[];
  disputed_payments: QueuePayment[];
}

export interface ThriftHistoryPayment {
  id: number;
  member_id: number;
  member_name: string;
  group_id: number;
  group_name: string;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  status: ThriftPaymentStatus;
  payer_confirmed: boolean;
  dispute_reason: string;
  dispute_audio: string | null;
  disputed_at: string | null;
  resolved_at: string | null;
}

export interface ThriftPaymentHistory {
  collector_payments: ThriftHistoryPayment[];
  payer_payments: ThriftHistoryPayment[];
}

export interface ThriftHistoryPaginated {
  count: number;
  next: string | null;
  previous: string | null;
  results: ThriftHistoryPayment[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const thriftService = {
  // ── Collector queue ──────────────────────────────────────────────────────────
  getCollectorQueue: async (): Promise<CollectorQueue> => {
    const { data } = await api.get('/api/thrift/collector-queue/');
    return data;
  },

  // ── Cross-group payment history ──────────────────────────────────────────────
  getMyPaymentHistory: async (): Promise<ThriftPaymentHistory> => {
    const { data } = await api.get('/api/thrift/my-payment-history/');
    return data;
  },

  getMyPaymentHistoryPage: async (type: 'payer' | 'collector', pageOrUrl: string | null): Promise<ThriftHistoryPaginated> => {
    if (pageOrUrl) {
      const { data } = await api.get(pageOrUrl);
      return data;
    }
    const { data } = await api.get('/api/thrift/my-payment-history/', { params: { type } });
    return data;
  },

  // ── Groups ──────────────────────────────────────────────────────────────────
  getGroups: async (): Promise<ThriftGroup[]> => {
    const { data } = await api.get('/api/thrift/');
    return data;
  },

  getGroup: async (id: number): Promise<ThriftGroup> => {
    const { data } = await api.get(`/api/thrift/${id}/`);
    return data;
  },

  createGroup: async (payload: {
    name: string;
    description?: string;
    frequency: ThriftFrequency;
    cycle_type: ThriftCycleType;
    start_date?: string | null;
    end_date?: string | null;
    org_id?: number | null;
    invite_token?: string | null;
  }): Promise<ThriftGroup> => {
    const { data } = await api.post('/api/thrift/', payload);
    return data;
  },

  regenerateInvite: async (id: number): Promise<{ invite_code: string }> => {
    const { data } = await api.post(`/api/thrift/${id}/invite/regenerate/`);
    return data;
  },

  // ── Members ─────────────────────────────────────────────────────────────────
  getMembers: async (groupId: number, statusFilter?: string): Promise<ThriftMember[]> => {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get(`/api/thrift/${groupId}/members/`, { params });
    return data;
  },

  joinByCode: async (payload: { invite_code: string; personal_amount: string }): Promise<{ message: string; member: ThriftMember }> => {
    const { data } = await api.post('/api/thrift/join/', payload);
    return data;
  },

  reviewMember: async (
    groupId: number,
    memberId: number,
    payload: { action: 'approve' | 'reject' | 'flag_amount'; reason?: string },
  ): Promise<ThriftMember> => {
    const { data } = await api.patch(`/api/thrift/${groupId}/members/${memberId}/`, payload);
    return data;
  },

  updateMyAmount: async (groupId: number, memberId: number, personalAmount: string): Promise<ThriftMember> => {
    const { data } = await api.patch(`/api/thrift/${groupId}/members/${memberId}/`, { personal_amount: personalAmount });
    return data;
  },

  toggleMemberKyc: async (groupId: number, memberId: number, isKycVerified: boolean): Promise<AjoUser> => {
    const { data } = await api.patch<AjoUser>(`/api/thrift/${groupId}/members/${memberId}/kyc/`, { is_kyc_verified: isKycVerified });
    return data;
  },

  // ── Payments ────────────────────────────────────────────────────────────────
  getPayments: async (groupId: number, memberId?: number): Promise<ThriftPayment[]> => {
    const params = memberId ? { member_id: memberId } : {};
    const { data } = await api.get(`/api/thrift/${groupId}/payments/`, { params });
    return data;
  },

  markPayment: async (groupId: number, payload: {
    member_id: number;
    period_date: string;
    amount: string;
    notes?: string;
  }): Promise<ThriftPayment> => {
    const { data } = await api.post(`/api/thrift/${groupId}/payments/`, payload);
    return data;
  },

  unmarkPayment: async (groupId: number, paymentId: number): Promise<void> => {
    await api.delete(`/api/thrift/${groupId}/payments/${paymentId}/`);
  },

  confirmPayment: async (groupId: number, paymentId: number): Promise<ThriftPayment> => {
    const { data } = await api.post(`/api/thrift/${groupId}/payments/${paymentId}/confirm/`);
    return data;
  },

  disputePayment: async (groupId: number, paymentId: number, reason: string, audioUri?: string): Promise<ThriftPayment> => {
    if (audioUri) {
      const form = new FormData();
      if (reason) form.append('reason', reason);
      form.append('dispute_audio', { uri: audioUri, name: 'dispute.m4a', type: 'audio/m4a' } as any);
      const { data } = await api.post(`/api/thrift/${groupId}/payments/${paymentId}/dispute/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post(`/api/thrift/${groupId}/payments/${paymentId}/dispute/`, { reason });
    return data;
  },

  // ── Cycles ──────────────────────────────────────────────────────────────────
  getCycles: async (groupId: number): Promise<ThriftCycle[]> => {
    const { data } = await api.get(`/api/thrift/${groupId}/cycles/`);
    return data;
  },

  endCycle: async (groupId: number): Promise<ThriftCycle> => {
    const { data } = await api.post(`/api/thrift/${groupId}/cycles/end/`);
    return data;
  },

  restartCycle: async (groupId: number, payload: { start_date?: string; end_date?: string | null }): Promise<ThriftCycle> => {
    const { data } = await api.post(`/api/thrift/${groupId}/cycles/restart/`, payload);
    return data;
  },

  // ── Reports ─────────────────────────────────────────────────────────────────
  reportCollector: async (groupId: number, reason: string): Promise<CollectorReport> => {
    const { data } = await api.post(`/api/thrift/${groupId}/report/`, { reason });
    return data;
  },

  // ── Organisations ────────────────────────────────────────────────────────────
  getPartnerOrgs: async (): Promise<ThriftOrganization[]> => {
    const { data } = await api.get('/api/thrift/orgs/partners/');
    return data;
  },

  getOrgs: async (): Promise<ThriftOrganization[]> => {
    const { data } = await api.get('/api/thrift/orgs/');
    return data;
  },

  getOrg: async (orgId: number): Promise<ThriftOrganization> => {
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/`);
    return data;
  },

  createOrg: async (payload: {
    name: string;
    org_type: OrgType;
    registration_number?: string;
    logo?: any;
  }): Promise<ThriftOrganization> => {
    const form = new FormData();
    form.append('name', payload.name);
    form.append('org_type', payload.org_type);
    if (payload.registration_number) form.append('registration_number', payload.registration_number);
    if (payload.logo) form.append('logo', payload.logo);
    const { data } = await api.post('/api/thrift/orgs/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateOrg: async (orgId: number, payload: Partial<{ name: string; org_type: OrgType; registration_number: string; logo: any }>): Promise<ThriftOrganization> => {
    const { data } = await api.patch(`/api/thrift/orgs/${orgId}/`, payload);
    return data;
  },

  getOrgMembers: async (orgId: number): Promise<ThriftOrgMember[]> => {
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/members/`);
    return data;
  },

  inviteCollector: async (orgId: number, email: string): Promise<{ detail: string }> => {
    const { data } = await api.post(`/api/thrift/orgs/${orgId}/members/`, { email });
    return data;
  },

  getMyOrgMemberships: async (): Promise<ThriftOrgMember[]> => {
    const { data } = await api.get('/api/thrift/orgs/my-memberships/');
    return data;
  },

  acceptOrgInvite: async (invite_token: string): Promise<ThriftOrgMember> => {
    const { data } = await api.post('/api/thrift/orgs/accept-invite/', { invite_token });
    return data;
  },

  orgMemberAction: async (orgId: number, memberId: number, action: 'approve' | 'suspend' | 'activate' | 'reject' | 'remove'): Promise<ThriftOrgMember | void> => {
    if (action === 'remove' || action === 'reject') {
      await api.patch(`/api/thrift/orgs/${orgId}/members/${memberId}/`, { action });
      return;
    }
    const { data } = await api.patch(`/api/thrift/orgs/${orgId}/members/${memberId}/`, { action });
    return data;
  },

  getOrgDashboard: async (orgId: number): Promise<{
    organization: ThriftOrganization;
    collectors: ThriftOrgMember[];
    pending_collectors: ThriftOrgMember[];
    groups: ThriftGroup[];
    recent_reports: CollectorReport[];
    payers: ThriftMember[];
    payment_stats: PaymentStats;
    collector_stats: Record<number, CollectorStats>;
  }> => {
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/dashboard/`);
    return data;
  },

  getOrgReports: async (orgId: number, statusFilter?: string): Promise<CollectorReport[]> => {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/reports/`, { params });
    return data;
  },

  resolveReport: async (orgId: number, reportId: number, action: 'resolve' | 'dismiss' | 'review', resolution_notes?: string): Promise<CollectorReport> => {
    const { data } = await api.patch(`/api/thrift/orgs/${orgId}/reports/${reportId}/`, { action, resolution_notes });
    return data;
  },
};
