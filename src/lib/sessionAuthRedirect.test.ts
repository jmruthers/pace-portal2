import { describe, expect, it, vi } from 'vitest';
import { applyShellSignedOutRedirect } from '@/lib/sessionAuthRedirect';

describe('applyShellSignedOutRedirect', () => {
  it('navigates to login when not on login or register', () => {
    const navigate = vi.fn();
    applyShellSignedOutRedirect('/dashboard', navigate);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('skips redirect from /login', () => {
    const navigate = vi.fn();
    applyShellSignedOutRedirect('/login', navigate);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('skips redirect from /register', () => {
    const navigate = vi.fn();
    applyShellSignedOutRedirect('/register', navigate);
    expect(navigate).not.toHaveBeenCalled();
  });
});
