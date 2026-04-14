import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LoginHistoryRecorder } from '@/shared/components/LoginHistoryRecorder';

const recordLogin = vi.fn();
const getSession = vi.fn();
const rpc = vi.fn();

vi.mock('@solvera/pace-core/login-history', () => ({
  recordLogin: (...args: unknown[]) => recordLogin(...args),
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'user-1' },
    supabase: {
      auth: { getSession },
    },
  }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContext: () => ({
    isLoading: false,
    selectedOrganisation: { id: 'org-1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({
    rpc,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {},
}));

describe('LoginHistoryRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({
      data: { session: { id: 'sess-1' } },
    });
    rpc.mockResolvedValue({ data: [{ app_id: 'app-1' }], error: null });
    recordLogin.mockResolvedValue({ ok: true, data: undefined });
  });

  it('invokes recordLogin once per session id', async () => {
    const { rerender } = render(<LoginHistoryRecorder />);

    await vi.waitFor(() => {
      expect(recordLogin).toHaveBeenCalledTimes(1);
    });

    expect(recordLogin.mock.calls[0]?.[1]).toMatchObject({
      user_id: 'user-1',
      session_id: 'sess-1',
      organisation_id: 'org-1',
    });

    rerender(<LoginHistoryRecorder />);

    await vi.waitFor(() => {
      expect(recordLogin).toHaveBeenCalledTimes(1);
    });
  });

  it('does not record when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<LoginHistoryRecorder />);
    await new Promise((r) => setTimeout(r, 30));
    expect(recordLogin).not.toHaveBeenCalled();
  });
});
