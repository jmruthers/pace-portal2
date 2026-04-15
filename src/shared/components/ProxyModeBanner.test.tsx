import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';

const proxy = vi.hoisted(() => ({
  isProxyActive: false,
  isValidating: false,
  validationError: null as string | null,
  targetMemberId: null as string | null,
  targetPersonId: null,
  actingUserId: null,
  clearProxy: vi.fn(),
  setProxyTargetMemberId: vi.fn(),
  proxyAttribution: {},
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => proxy,
}));

describe('ProxyModeBanner', () => {
  it('shows validating state', () => {
    proxy.isValidating = true;
    proxy.isProxyActive = false;
    proxy.validationError = null;
    proxy.targetMemberId = null;
    render(<ProxyModeBanner />);
    expect(screen.getByText(/checking delegated access/i)).toBeInTheDocument();
  });

  it('shows validation error', () => {
    proxy.isValidating = false;
    proxy.validationError = 'Not allowed';
    proxy.isProxyActive = false;
    proxy.targetMemberId = null;
    render(<ProxyModeBanner />);
    expect(screen.getByText(/not allowed/i)).toBeInTheDocument();
  });

  it('shows delegated context when proxy is active', () => {
    proxy.isValidating = false;
    proxy.validationError = null;
    proxy.isProxyActive = true;
    proxy.targetMemberId = 'm1';
    render(<ProxyModeBanner />);
    expect(screen.getByText(/delegated viewing context/i)).toBeInTheDocument();
  });

  it('renders nothing when proxy inactive', () => {
    proxy.isValidating = false;
    proxy.validationError = null;
    proxy.isProxyActive = false;
    proxy.targetMemberId = null;
    const { container } = render(<ProxyModeBanner />);
    expect(container.firstChild).toBeNull();
  });
});
