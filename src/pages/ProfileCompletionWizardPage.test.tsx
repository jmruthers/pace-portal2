import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileCompletionWizardPage } from '@/pages/ProfileCompletionWizardPage';

const mockWizard = vi.fn();

vi.mock('@/hooks/auth/useProfileCompletionWizard', () => ({
  useProfileCompletionWizard: () => mockWizard(),
}));

function baseWizardState(overrides: Record<string, unknown> = {}) {
  return {
    currentStep: 1,
    totalSteps: 3,
    stepLabels: ['Personal details', 'Contact details', 'Membership details'],
    progressValue: 67,
    isShellLoading: false,
    shellError: null,
    referenceData: {},
    personMember: {},
    person: { first_name: 'A', last_name: 'B', email: 'a@b.c' },
    member: null,
    phones: [{ phone_number: '1' }],
    addressData: { residential: { full_address: '1 St' }, isUnresolved: false },
    mapsPreload: {
      phase: 'ready' as const,
      result: { ok: true, data: { status: 'skipped' as const, reason: 'no_api_key' as const } },
    },
    saveStatus: 'idle',
    validationMessage: null,
    eventSlug: 'evt',
    formSlug: 'frm',
    completionPathPreview: '/evt/frm?fromWizard=true',
    saveAndContinue: vi.fn(),
    goToPrevious: vi.fn(),
    goToStep: vi.fn(),
    cancel: vi.fn(),
    completeProfile: vi.fn(),
    skipFinalStep: vi.fn(),
    ...overrides,
  };
}

describe('ProfileCompletionWizardPage', () => {
  describe('loading and main chrome', () => {
    it('shows loading when the shell is resolving data', () => {
      mockWizard.mockReturnValue(
        baseWizardState({
          isShellLoading: true,
          progressValue: 33,
          currentStep: 0,
          referenceData: null,
          personMember: null,
          person: null,
          phones: [],
          addressData: { residential: null, isUnresolved: true },
          mapsPreload: { phase: 'idle' },
          eventSlug: null,
          formSlug: null,
          completionPathPreview: '/dashboard',
        })
      );

      render(<ProfileCompletionWizardPage />);
      expect(screen.getByLabelText(/loading profile data/i)).toBeInTheDocument();
    });

    it('renders step chrome when data is ready', () => {
      mockWizard.mockReturnValue(baseWizardState());

      render(<ProfileCompletionWizardPage />);
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /wizard steps/i })).toBeInTheDocument();
    });
  });

  describe('alerts and final step', () => {
    it('shows shell error message when shellError is set', () => {
      mockWizard.mockReturnValue(
        baseWizardState({ shellError: new Error('Profile load failed') })
      );
      render(<ProfileCompletionWizardPage />);
      expect(screen.getByRole('alert')).toHaveTextContent(/Profile load failed/);
    });

    it('shows validation message when validationMessage is set', () => {
      mockWizard.mockReturnValue(baseWizardState({ validationMessage: 'Fix the phone field.' }));
      render(<ProfileCompletionWizardPage />);
      expect(screen.getByText(/check this step/i)).toBeInTheDocument();
      expect(screen.getByText(/Fix the phone field/)).toBeInTheDocument();
    });

    it('shows save failed when saveStatus is error', () => {
      mockWizard.mockReturnValue(baseWizardState({ saveStatus: 'error' }));
      render(<ProfileCompletionWizardPage />);
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });

    it('renders final-step actions on the last step', async () => {
      const user = userEvent.setup();
      const cancel = vi.fn();
      mockWizard.mockReturnValue(
        baseWizardState({
          currentStep: 2,
          progressValue: 100,
          cancel,
        })
      );

      render(<ProfileCompletionWizardPage />);

      expect(screen.getByRole('button', { name: /^skip$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });
});
