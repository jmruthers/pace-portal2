import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseTyped from '@/lib/supabase-typed';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';

const rbacState = vi.hoisted(() => ({
  secure: null as object | null,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => rbacState.secure,
}));

const proxy = vi.hoisted(() => ({
  isProxyActive: false,
  isValidating: false,
  validationError: null as string | null,
  targetMemberId: null as string | null,
  targetPersonId: null as string | null,
  actingUserId: null as string | null,
  clearProxy: vi.fn(),
  setProxyTargetMemberId: vi.fn(),
  proxyAttribution: {},
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => proxy,
}));

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProxyModeBanner />
    </QueryClientProvider>
  );
}

describe('ProxyModeBanner', () => {
  beforeEach(() => {
    rbacState.secure = null;
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows validating state', () => {
    proxy.isValidating = true;
    proxy.isProxyActive = false;
    proxy.validationError = null;
    proxy.targetMemberId = null;
    proxy.targetPersonId = null;
    renderBanner();
    expect(screen.getByText(/checking delegated access/i)).toBeInTheDocument();
  });

  it('shows validation error', () => {
    proxy.isValidating = false;
    proxy.validationError = 'Not allowed';
    proxy.isProxyActive = false;
    proxy.targetMemberId = null;
    proxy.targetPersonId = null;
    renderBanner();
    expect(screen.getByText(/not allowed/i)).toBeInTheDocument();
  });

  it('shows delegated context when proxy is active', () => {
    proxy.isValidating = false;
    proxy.validationError = null;
    proxy.isProxyActive = true;
    proxy.targetMemberId = 'm1';
    proxy.targetPersonId = 'p-target';
    renderBanner();
    expect(screen.getByText(/delegated context active/i)).toBeInTheDocument();
    expect(screen.getByText(/working on behalf of/i)).toBeInTheDocument();
  });

  it('shows resolved target name when core_person loads', async () => {
    rbacState.secure = {};
    proxy.isValidating = false;
    proxy.validationError = null;
    proxy.isProxyActive = true;
    proxy.targetMemberId = 'm1';
    proxy.targetPersonId = 'p99';
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { first_name: 'Pat', last_name: 'Nova' },
          error: null,
        }),
      })),
    } as never);

    renderBanner();
    await waitFor(() => {
      expect(screen.getByText(/Pat Nova/)).toBeInTheDocument();
    });
  });

  it('renders nothing when proxy inactive', () => {
    proxy.isValidating = false;
    proxy.validationError = null;
    proxy.isProxyActive = false;
    proxy.targetMemberId = null;
    proxy.targetPersonId = null;
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });
});
