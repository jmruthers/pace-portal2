import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  TOKEN_APPROVAL_LOAD_FAILED,
  useTokenApproval,
} from '@/hooks/approvals/useTokenApproval';
import { TOKEN_APPROVAL_LINK_UNAVAILABLE } from '@/hooks/approvals/tokenApprovalContracts';

const { hasBrowserConfig, resolveToken, submitToken } = vi.hoisted(() => ({
  hasBrowserConfig: vi.fn(() => true),
  resolveToken: vi.fn(),
  submitToken: vi.fn(),
}));

vi.mock('@/lib/supabaseBrowserEnv', () => ({
  hasSupabaseBrowserConfig: () => hasBrowserConfig(),
}));

vi.mock('@/lib/supabaseAnonRpc', () => ({
  appBaseApplicationCheckResolveToken: (token: string) => resolveToken(token),
  appBaseApplicationCheckSubmit: (args: {
    p_raw_token: string;
    p_outcome: string;
    p_notes: string | null;
  }) => submitToken(args),
}));

const RESOLVE_OK = {
  check_id: '10000000-0000-4000-8000-000000000001',
  application_id: '20000000-0000-4000-8000-000000000002',
  requirement_id: '30000000-0000-4000-8000-000000000003',
  expires_at: null,
  check_type: 'guardian_approval',
  event_title: 'Summer camp',
  registration_type_name: 'Youth',
  applicant_display_name: 'Alex Pat',
};

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useTokenApproval', () => {
  beforeEach(() => {
    resolveToken.mockReset();
    submitToken.mockReset();
    hasBrowserConfig.mockReturnValue(true);
  });

  it('returns missing_token when route token is empty', () => {
    const { result } = renderHook(() => useTokenApproval(undefined), { wrapper: wrapper() });
    expect(result.current.phase).toBe('missing_token');
  });

  it('returns not_configured when Supabase env is absent', () => {
    hasBrowserConfig.mockReturnValue(false);
    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });
    expect(result.current.phase).toBe('not_configured');
  });

  it('resolves to ready with participant-safe context', async () => {
    resolveToken.mockResolvedValue({ data: RESOLVE_OK, error: null });

    const { result } = renderHook(() => useTokenApproval('raw-secret'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    expect(result.current.resolveContext).toEqual(RESOLVE_OK);
    expect(resolveToken).toHaveBeenCalledWith('raw-secret');
  });

  it('maps malformed resolve JSON to terminal_invalid', async () => {
    resolveToken.mockResolvedValue({
      data: { ...RESOLVE_OK, extra_key: 'nope' },
      error: null,
    });

    const { result } = renderHook(() => useTokenApproval('t1'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('terminal_invalid');
    });
    expect(result.current.terminalMessage).toBe(TOKEN_APPROVAL_LINK_UNAVAILABLE);
  });

  it('maps Token is required resolve error to terminal_invalid', async () => {
    resolveToken.mockResolvedValue({ data: null, error: { message: 'Token is required' } });

    const { result } = renderHook(() => useTokenApproval('bad'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('terminal_invalid');
    });
    expect(result.current.terminalMessage).toBe(TOKEN_APPROVAL_LINK_UNAVAILABLE);
  });

  it('maps Invalid or expired token resolve error to terminal_invalid', async () => {
    resolveToken.mockResolvedValue({ data: null, error: { message: 'Invalid or expired token' } });

    const { result } = renderHook(() => useTokenApproval('bad'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('terminal_invalid');
    });
    expect(result.current.terminalMessage).toBe(TOKEN_APPROVAL_LINK_UNAVAILABLE);
  });

  it('maps unexpected resolve error to generic load message', async () => {
    resolveToken.mockResolvedValue({ data: null, error: { message: 'Internal server error' } });

    const { result } = renderHook(() => useTokenApproval('x'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('terminal_invalid');
    });
    expect(result.current.terminalMessage).toBe(TOKEN_APPROVAL_LOAD_FAILED);
  });

  it('submits approve and reaches submitted phase', async () => {
    resolveToken.mockResolvedValueOnce({ data: RESOLVE_OK, error: null });
    submitToken.mockResolvedValueOnce({
      data: {
        check_id: RESOLVE_OK.check_id,
        previous_status: 'pending',
        new_status: 'satisfied',
      },
      error: null,
    });

    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.submitApproval({ outcome: 'approve' });

    await waitFor(() => {
      expect(result.current.phase).toBe('submitted');
    });
    expect(result.current.submitResult?.new_status).toBe('satisfied');
    expect(submitToken).toHaveBeenLastCalledWith({
      p_raw_token: 'tok',
      p_outcome: 'approve',
      p_notes: null,
    });
  });

  it('blocks reject without notes before RPC (submit_validation)', async () => {
    resolveToken.mockResolvedValue({ data: RESOLVE_OK, error: null });

    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.submitApproval({ outcome: 'reject', notes: '' });

    await waitFor(() => {
      expect(result.current.phase).toBe('submit_validation');
    });
    expect(submitToken).not.toHaveBeenCalled();
  });

  it('maps submit consumed token to terminal_invalid', async () => {
    resolveToken.mockResolvedValueOnce({ data: RESOLVE_OK, error: null });
    submitToken.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid, expired, or already used token' },
    });

    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.submitApproval({ outcome: 'approve' });

    await waitFor(() => {
      expect(result.current.phase).toBe('terminal_invalid');
    });
    expect(result.current.terminalMessage).toBe(TOKEN_APPROVAL_LINK_UNAVAILABLE);
  });

  it('surfaces RPC reject-notes requirement as submit_validation', async () => {
    resolveToken.mockResolvedValueOnce({ data: RESOLVE_OK, error: null });
    submitToken.mockResolvedValueOnce({
      data: null,
      error: { message: 'Comments are required for reject' },
    });

    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.submitApproval({ outcome: 'reject', notes: 'valid notes' });

    await waitFor(() => {
      expect(result.current.phase).toBe('submit_validation');
    });
  });

  it('submits reject with notes to failed status', async () => {
    resolveToken.mockResolvedValueOnce({ data: RESOLVE_OK, error: null });
    submitToken.mockResolvedValueOnce({
      data: {
        check_id: RESOLVE_OK.check_id,
        previous_status: 'pending',
        new_status: 'failed',
      },
      error: null,
    });

    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.submitApproval({ outcome: 'reject', notes: 'Cannot approve yet' });

    await waitFor(() => {
      expect(result.current.phase).toBe('submitted');
    });
    expect(result.current.submitResult?.new_status).toBe('failed');
    expect(submitToken).toHaveBeenLastCalledWith({
      p_raw_token: 'tok',
      p_outcome: 'reject',
      p_notes: 'Cannot approve yet',
    });
  });

  it('sets hasSubmitFailure on generic submit RPC error', async () => {
    resolveToken.mockResolvedValueOnce({ data: RESOLVE_OK, error: null });
    submitToken.mockResolvedValueOnce({ data: null, error: { message: 'Upstream failure' } });

    const { result } = renderHook(() => useTokenApproval('tok'), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.submitApproval({ outcome: 'approve' });

    await waitFor(() => {
      expect(result.current.hasSubmitFailure).toBe(true);
    });
    expect(result.current.phase).toBe('ready');
  });
});
