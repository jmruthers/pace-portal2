import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as approvalHook from '@/hooks/approvals/useTokenApproval';
import { TOKEN_APPROVAL_LINK_UNAVAILABLE } from '@/hooks/approvals/tokenApprovalContracts';
import { TokenApprovalPage } from '@/pages/public/TokenApprovalPage';

vi.spyOn(approvalHook, 'useTokenApproval');

const mockUse = vi.mocked(approvalHook.useTokenApproval);

function renderPage(initial = '/approvals/abc') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/approvals/:token" element={<TokenApprovalPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TokenApprovalPage', () => {
  const RESOLVE_CTX = {
    check_id: '10000000-0000-4000-8000-000000000001',
    application_id: '20000000-0000-4000-8000-000000000002',
    requirement_id: '30000000-0000-4000-8000-000000000003',
    expires_at: null,
    check_type: 'guardian_approval',
    event_title: 'Summer camp',
    registration_type_name: 'Youth',
    applicant_display_name: 'Alex Pat',
  };

  const baseReturn = {
    resolveContext: null as typeof RESOLVE_CTX | null,
    submitResult: null,
    terminalMessage: TOKEN_APPROVAL_LINK_UNAVAILABLE,
    hasSubmitFailure: false,
    submitApproval: vi.fn(),
    clearSubmitValidation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows participant-safe terminal copy without expired or used hints', () => {
    mockUse.mockReturnValue({
      ...baseReturn,
      phase: 'terminal_invalid',
    });

    renderPage();

    expect(screen.getByText(TOKEN_APPROVAL_LINK_UNAVAILABLE)).toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).toBeNull();
    expect(screen.queryByText(/already used/i)).toBeNull();
  });

  it('invokes submitApproval(approve) when Approve is pressed', async () => {
    const submitApproval = vi.fn();
    mockUse.mockReturnValue({
      ...baseReturn,
      phase: 'ready',
      resolveContext: RESOLVE_CTX,
      submitApproval,
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(submitApproval).toHaveBeenCalledWith({ outcome: 'approve' });
  });

  it('shows validation when declining with empty comments', () => {
    mockUse.mockReturnValue({
      ...baseReturn,
      phase: 'submit_validation',
      resolveContext: RESOLVE_CTX,
    });

    renderPage();

    expect(
      screen.getByText(/explain your response when you choose not to approve/i)
    ).toBeInTheDocument();
  });

  it('shows missing link when hook reports missing_token', () => {
    mockUse.mockReturnValue({
      ...baseReturn,
      phase: 'missing_token',
    });

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Missing link');
    expect(screen.getByText(/approval link is incomplete/i)).toBeInTheDocument();
  });

  it('shows thank-you confirmation after approve submit', () => {
    mockUse.mockReturnValue({
      ...baseReturn,
      phase: 'submitted',
      submitResult: {
        check_id: RESOLVE_CTX.check_id,
        previous_status: 'pending',
        new_status: 'satisfied',
      },
    });

    renderPage();

    expect(screen.getByRole('heading', { level: 3, name: 'Thank you' })).toBeInTheDocument();
    expect(screen.getByText(/approval has been recorded/i)).toBeInTheDocument();
  });
});
