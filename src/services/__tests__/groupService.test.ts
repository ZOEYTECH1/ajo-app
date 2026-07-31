/**
 * Unit tests for groupService — verifies correct API calls, URL construction,
 * and parameter handling.
 */

import { groupService } from '../groupService';

// ─── Mock the api axios instance ─────────────────────────────────────────────

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get:    jest.fn(),
    post:   jest.fn(),
    patch:  jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

// groupService doesn't use the store directly, but api.ts imports it
jest.mock('../../store/useAppStore', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'fake-token', logout: jest.fn() }),
  },
}));

import api from '../api';

const mockGet    = api.get    as jest.Mock;
const mockPost   = api.post   as jest.Mock;
const mockPatch  = api.patch  as jest.Mock;
const mockDelete = api.delete as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Groups ───────────────────────────────────────────────────────────────────

describe('groupService.getGroups', () => {
  it('calls GET /api/groups/', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await groupService.getGroups();
    expect(mockGet).toHaveBeenCalledWith('/api/groups/');
  });
});

describe('groupService.getGroupDetail', () => {
  it('calls GET /api/groups/<id>/', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 5 } });
    await groupService.getGroupDetail(5);
    expect(mockGet).toHaveBeenCalledWith('/api/groups/5/');
  });
});

describe('groupService.createGroup', () => {
  it('calls POST /api/groups/ with the payload', async () => {
    const payload = {
      name: 'Lagos Savers',
      contribution_amount: '5000',
      contribution_frequency: 'monthly' as const,
    };
    mockPost.mockResolvedValueOnce({ data: { id: 1, ...payload } });

    await groupService.createGroup(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/groups/', payload);
  });
});

describe('groupService.updateGroup', () => {
  it('calls PATCH /api/groups/<id>/ with partial fields', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 3, name: 'Renamed' } });

    await groupService.updateGroup(3, { name: 'Renamed' });

    expect(mockPatch).toHaveBeenCalledWith('/api/groups/3/', { name: 'Renamed' });
  });
});

// ─── Members ─────────────────────────────────────────────────────────────────

describe('groupService.getMembers', () => {
  it('calls GET /api/groups/<id>/members/ without params when status is omitted', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await groupService.getMembers(7);

    expect(mockGet).toHaveBeenCalledWith('/api/groups/7/members/', { params: {} });
  });

  it('includes status in params when provided', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await groupService.getMembers(7, 'pending');

    expect(mockGet).toHaveBeenCalledWith('/api/groups/7/members/', {
      params: { status: 'pending' },
    });
  });
});

describe('groupService.reviewMembership', () => {
  it('calls PATCH with the action field', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 10, status: 'approved' } });

    await groupService.reviewMembership(7, 10, 'approve');

    expect(mockPatch).toHaveBeenCalledWith('/api/groups/7/members/10/', {
      action: 'approve',
    });
  });
});

describe('groupService.removeMember', () => {
  it('calls DELETE /api/groups/<id>/members/<memberId>/', async () => {
    mockDelete.mockResolvedValueOnce({ data: null });

    await groupService.removeMember(7, 10);

    expect(mockDelete).toHaveBeenCalledWith('/api/groups/7/members/10/');
  });
});

// ─── Payments ────────────────────────────────────────────────────────────────

describe('groupService.getPayments', () => {
  it('calls GET /api/groups/<id>/payments/ without params when status omitted', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await groupService.getPayments(2);

    expect(mockGet).toHaveBeenCalledWith('/api/groups/2/payments/', { params: {} });
  });

  it('includes status param when provided', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await groupService.getPayments(2, 'pending');

    expect(mockGet).toHaveBeenCalledWith('/api/groups/2/payments/', {
      params: { status: 'pending' },
    });
  });
});

describe('groupService.reviewPayment', () => {
  it('calls PATCH with action only when approving', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 99, status: 'approved' } });

    await groupService.reviewPayment(2, 99, 'approve');

    expect(mockPatch).toHaveBeenCalledWith('/api/groups/2/payments/99/', {
      action: 'approve',
    });
  });

  it('includes reason in body when rejecting', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 99, status: 'rejected' } });

    await groupService.reviewPayment(2, 99, 'reject', 'Amount mismatch');

    expect(mockPatch).toHaveBeenCalledWith('/api/groups/2/payments/99/', {
      action: 'reject',
      reason: 'Amount mismatch',
    });
  });

  it('omits reason from body when reason is undefined', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 99, status: 'approved' } });

    await groupService.reviewPayment(2, 99, 'approve', undefined);

    const body = mockPatch.mock.calls[0][1] as Record<string, string>;
    expect(body).not.toHaveProperty('reason');
  });
});

describe('groupService.getPaymentHistory', () => {
  it('calls GET /api/payments/history/', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await groupService.getPaymentHistory();
    expect(mockGet).toHaveBeenCalledWith('/api/payments/history/');
  });
});

// ─── Cycles ──────────────────────────────────────────────────────────────────

describe('groupService.startCycle', () => {
  it('calls POST /api/groups/<id>/cycles/ with dates', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 1, cycle_number: 1 } });

    await groupService.startCycle(3, '2026-01-01', '2026-01-31');

    expect(mockPost).toHaveBeenCalledWith('/api/groups/3/cycles/', {
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    });
  });
});

describe('groupService.closeCycle', () => {
  it('calls POST /api/groups/<id>/cycles/<cycleId>/close/', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 1, status: 'closed' } });

    await groupService.closeCycle(3, 1);

    expect(mockPost).toHaveBeenCalledWith('/api/groups/3/cycles/1/close/');
  });
});

// ─── Invite ──────────────────────────────────────────────────────────────────

describe('groupService.joinByCode', () => {
  it('normalises invite code to uppercase before sending', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok', group_name: 'X', membership: {} } });

    await groupService.joinByCode('abc123');

    expect(mockPost).toHaveBeenCalledWith('/api/invite/join/', { invite_code: 'ABC123' });
  });

  it('trims whitespace from the invite code', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok', group_name: 'X', membership: {} } });

    await groupService.joinByCode('  XYZ789  ');

    const body = mockPost.mock.calls[0][1] as { invite_code: string };
    expect(body.invite_code).toBe('XYZ789');
  });
});

describe('groupService.regenerateInviteCode', () => {
  it('calls POST /api/groups/<id>/invite/regenerate/', async () => {
    mockPost.mockResolvedValueOnce({ data: { invite_code: 'NEWCODE1' } });

    const result = await groupService.regenerateInviteCode(4);

    expect(mockPost).toHaveBeenCalledWith('/api/groups/4/invite/regenerate/');
    expect(result).toEqual({ invite_code: 'NEWCODE1' });
  });
});

// ─── Subscription ─────────────────────────────────────────────────────────────

describe('groupService.initiateSubscription', () => {
  it('calls POST /api/groups/<id>/subscription/initiate/ with cycles', async () => {
    mockPost.mockResolvedValueOnce({ data: { link: 'https://pay.me', subscription: {} } });

    await groupService.initiateSubscription(6, 3);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/groups/6/subscription/initiate/',
      { cycles: 3 },
    );
  });
});

describe('groupService.verifySubscription', () => {
  it('calls GET /api/groups/<id>/subscription/verify/ with transaction_id param', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'successful' } });

    await groupService.verifySubscription(6, 'txn-abc');

    expect(mockGet).toHaveBeenCalledWith(
      '/api/groups/6/subscription/verify/',
      { params: { transaction_id: 'txn-abc' } },
    );
  });
});
