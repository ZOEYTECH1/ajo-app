import api from './api';
import type { AjoUser } from '../store/useAppStore';

// ─── Shared paginated result type ─────────────────────────────────────────────
export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Group {
  id: number;
  name: string;
  description: string;
  rules?: string;
  contribution_amount: string;
  contribution_frequency: 'daily' | 'weekly' | 'monthly';
  collection_day: number | null;
  grace_period_days: number;
  invite_code: string;
  member_count: number;
  admin: AjoUser;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expires: string | null;
  is_subscription_active: boolean;
  is_on_trial: boolean;
  created_at: string;
}

export type MembershipStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus    = 'pending' | 'approved' | 'rejected';
export type CycleStatus      = 'active'  | 'closed';
export type ReviewAction     = 'approve' | 'reject';

export interface Membership {
  id: number;
  user: AjoUser;
  group: number;
  status: MembershipStatus;
  joined_at: string | null;
  total_approved: string;
  consecutive_default_streak: number;
}

export interface RemovalProposal {
  id: number;
  target_membership: number;
  target_name: string;
  target_photo: string | null;
  target_user_id: number;
  status: 'pending' | 'passed' | 'rejected';
  eligible_count: number;
  yes_count: number;
  no_count: number;
  current_user_vote: boolean | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Payment {
  id: number;
  member_name: string;
  member_email: string;
  group_id: number;
  group_name: string;
  amount_entered: string;
  amount_ocr: string | null;
  status: PaymentStatus;
  receipt_image: string | null;
  reviewed_by: AjoUser | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  cycle_number: number | null;
  submitted_at: string;
}

export interface Cycle {
  id: number;
  cycle_number: number;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  is_over: boolean;
  can_normal_close: boolean;
  force_close_requested: boolean;
  force_close_acceptor_count: number;
  total_member_count: number;
}

export interface Defaulter {
  id: number;
  user: AjoUser;
  total_approved: string;
}

export interface Subscription {
  id: number;
  cycles: number;
  amount: string;
  status: 'pending' | 'successful' | 'failed';
  tx_ref: string;
  extends_until: string | null;
  verified_at: string | null;
  initiated_by_email: string;
  group_name: string;
}

export interface CollectionSlot {
  id: number;             // membership_id
  user_id: number;
  full_name: string;
  profile_photo: string | null;
  collection_slot: number;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateGroupPayload {
  name: string;
  description?: string;
  contribution_amount: string;
  contribution_frequency: 'daily' | 'weekly' | 'monthly';
  collection_day?: number;
  grace_period_days?: number;
  start_date?: string;  // ISO date YYYY-MM-DD — auto-creates first cycle
  end_date?: string;
}

export interface SubmitPaymentPayload {
  group_id: number;
  amount_entered: string;
  receipt_image?: {
    uri: string;
    name: string;
    type: string;
  } | null;
}

// ─── Group service ─────────────────────────────────────────────────────────────

export const groupService = {
  // ── Groups ──────────────────────────────────────────────────────────────────

  getGroups: async (): Promise<Group[]> => {
    const res = await api.get('/api/groups/');
    return res.data;
  },

  getGroupDetail: async (groupId: number): Promise<Group> => {
    const res = await api.get(`/api/groups/${groupId}/`);
    return res.data;
  },

  createGroup: async (data: CreateGroupPayload): Promise<Group> => {
    const res = await api.post('/api/groups/', data);
    return res.data;
  },

  updateGroup: async (groupId: number, data: Partial<Pick<Group, 'name' | 'description' | 'grace_period_days'> & { rules?: string }>): Promise<Group> => {
    const res = await api.patch(`/api/groups/${groupId}/`, data);
    return res.data;
  },

  joinGroup: async (groupId: number): Promise<Membership> => {
    const res = await api.post(`/api/groups/${groupId}/join/`);
    return res.data;
  },

  // ── Members ─────────────────────────────────────────────────────────────────

  getMembers: async (groupId: number, status?: MembershipStatus): Promise<Membership[]> => {
    const params = status ? { status } : {};
    const res = await api.get(`/api/groups/${groupId}/members/`, { params });
    return res.data;
  },

  reviewMembership: async (
    groupId: number,
    membershipId: number,
    action: ReviewAction,
  ): Promise<Membership> => {
    const res = await api.patch(`/api/groups/${groupId}/members/${membershipId}/`, { action });
    return res.data;
  },

  leaveGroup: async (groupId: number): Promise<{ detail: string }> => {
    const res = await api.post(`/api/groups/${groupId}/leave/`);
    return res.data;
  },

  removeMember: async (groupId: number, membershipId: number): Promise<void> => {
    await api.delete(`/api/groups/${groupId}/members/${membershipId}/`);
  },

  proposeRemoval: async (groupId: number, membershipId: number): Promise<RemovalProposal> => {
    const res = await api.post(`/api/groups/${groupId}/members/${membershipId}/propose-removal/`);
    return res.data;
  },

  castRemovalVote: async (groupId: number, proposalId: number, approved: boolean): Promise<RemovalProposal> => {
    const res = await api.post(`/api/groups/${groupId}/removals/${proposalId}/vote/`, { approved });
    return res.data;
  },

  getRemovalProposals: async (groupId: number): Promise<RemovalProposal[]> => {
    const res = await api.get(`/api/groups/${groupId}/removals/`);
    return res.data;
  },

  // ── Payments ─────────────────────────────────────────────────────────────────

  getPayments: async (groupId: number, status?: PaymentStatus): Promise<Payment[]> => {
    const params = status ? { status } : {};
    const res = await api.get(`/api/groups/${groupId}/payments/`, { params });
    return res.data;
  },

  getPaymentHistory: async (): Promise<Payment[]> => {
    const res = await api.get('/api/payments/history/');
    return res.data.results ?? [];
  },

  getPaymentHistoryPage: async (page: number): Promise<PaginatedResult<Payment>> => {
    const res = await api.get('/api/payments/history/', { params: { page } });
    return res.data;
  },

  submitPayment: async ({ group_id, amount_entered, receipt_image }: SubmitPaymentPayload): Promise<Payment> => {
    const form = new FormData();
    form.append('amount_entered', amount_entered);
    if (receipt_image) {
      form.append('receipt_image', receipt_image as any);
    }
    const res = await api.post(`/api/groups/${group_id}/payments/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  reviewPayment: async (
    groupId: number,
    paymentId: number,
    action: ReviewAction,
    reason?: string,
  ): Promise<Payment> => {
    const body: Record<string, string> = { action };
    if (reason) body.reason = reason;
    const res = await api.patch(`/api/groups/${groupId}/payments/${paymentId}/`, body);
    return res.data;
  },

  // ── Cycles ───────────────────────────────────────────────────────────────────

  getCycles: async (groupId: number): Promise<Cycle[]> => {
    const res = await api.get(`/api/groups/${groupId}/cycles/`);
    return res.data;
  },

  startCycle: async (groupId: number, start_date: string, end_date: string): Promise<Cycle> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/`, { start_date, end_date });
    return res.data;
  },

  closeCycle: async (groupId: number, cycleId: number): Promise<Cycle> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/${cycleId}/close/`);
    return res.data;
  },

  requestEarlyClose: async (groupId: number, cycleId: number): Promise<Cycle> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/${cycleId}/request-early-close/`);
    return res.data;
  },

  acceptEarlyClose: async (groupId: number, cycleId: number): Promise<{ message: string; accepted_count: number; total_count: number }> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/${cycleId}/accept-early-close/`);
    return res.data;
  },

  getDefaulters: async (groupId: number, cycleId: number): Promise<{ cycle_number: number; end_date: string; status: CycleStatus; visible_from: string; grace_period_active: boolean; defaulters: Defaulter[] }> => {
    const res = await api.get(`/api/groups/${groupId}/cycles/${cycleId}/defaulters/`);
    return res.data;
  },

  // ── Invite ───────────────────────────────────────────────────────────────────

  joinByCode: async (invite_code: string): Promise<{ message: string; group_name: string; membership: Membership }> => {
    const res = await api.post('/api/invite/join/', { invite_code: invite_code.toUpperCase().trim() });
    return res.data;
  },

  regenerateInviteCode: async (groupId: number): Promise<{ invite_code: string }> => {
    const res = await api.post(`/api/groups/${groupId}/invite/regenerate/`);
    return res.data;
  },

  // ── Collection order ─────────────────────────────────────────────────────────

  getCollectionOrder: async (groupId: number): Promise<CollectionSlot[]> => {
    const res = await api.get(`/api/groups/${groupId}/collection-order/`);
    return res.data;
  },

  updateCollectionOrder: async (groupId: number, order: number[]): Promise<CollectionSlot[]> => {
    const res = await api.patch(`/api/groups/${groupId}/collection-order/`, { order });
    return res.data;
  },

  // ── Subscription ─────────────────────────────────────────────────────────────

  initiateSubscription: async (groupId: number, cycles: number): Promise<{ link: string; subscription: Subscription }> => {
    const res = await api.post(`/api/groups/${groupId}/subscription/initiate/`, { cycles });
    return res.data;
  },

  verifySubscription: async (groupId: number, transaction_id: string): Promise<Subscription> => {
    const res = await api.get(`/api/groups/${groupId}/subscription/verify/`, {
      params: { transaction_id },
    });
    return res.data;
  },
};
