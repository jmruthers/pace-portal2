import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useZodForm } from '@solvera/pace-core/hooks';
import {
  emptyMemberProfileFormValues,
  memberProfileWizardSchema,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import { ProfileCompletionWizardPage } from '@/pages/ProfileCompletionWizardPage';

const mockWizard = vi.fn();

vi.mock('@/hooks/auth/useProfileCompletionWizard', () => ({
  useProfileCompletionWizard: () => mockWizard(),
}));

const emptyReferenceBundle = {
  phoneTypes: [],
  membershipTypes: [],
  genderTypes: [],
  pronounTypes: [],
};

function TestWizardPage() {
  const form = useZodForm({
    schema: memberProfileWizardSchema,
    defaultValues: emptyMemberProfileFormValues(),
  });
  mockWizard.mockReturnValue({
    ...baseWizardState(),
    form,
  });
  return <ProfileCompletionWizardPage />;
}

function LoadingWizardPage() {
  const form = useZodForm({
    schema: memberProfileWizardSchema,
    defaultValues: emptyMemberProfileFormValues(),
  });
  mockWizard.mockReturnValue(
    baseWizardState({
      isShellLoading: true,
      progressValue: 33,
      currentStep: 0,
      referenceData: null,
      personMember: null,
      person: null,
      phones: [],
      addressData: { residential: null, postal: null, isUnresolved: true },
      mapsPreload: { phase: 'idle' },
      eventSlug: null,
      formSlug: null,
      completionPathPreview: '/dashboard',
      form,
    })
  );
  return <ProfileCompletionWizardPage />;
}

function baseWizardState(overrides: Record<string, unknown> = {}) {
  return {
    currentStep: 1,
    totalSteps: 3,
    stepLabels: ['Personal details', 'Contact details', 'Membership details'],
    progressValue: 67,
    isShellLoading: false,
    shellError: null,
    referenceData: emptyReferenceBundle,
    personMember: {},
    person: { first_name: 'A', last_name: 'B', email: 'a@b.c' },
    member: null,
    phones: [{ phone_number: '1' }],
    addressData: {
      residential: { full_address: '1 St' },
      postal: null,
      isUnresolved: false,
    },
    mapsPreload: {
      phase: 'ready' as const,
      result: { ok: true, data: { status: 'skipped' as const, reason: 'no_api_key' as const } },
    },
    saveStatus: 'idle',
    saveErrorMessage: null,
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
      render(<LoadingWizardPage />);
      expect(screen.getByLabelText(/loading profile data/i)).toBeInTheDocument();
    });

    it('renders step chrome when data is ready', () => {
      render(<TestWizardPage />);
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /wizard steps/i })).toBeInTheDocument();
    });
  });

  describe('alerts and final step', () => {
    function ShellErrorPage() {
      const form = useZodForm({
        schema: memberProfileWizardSchema,
        defaultValues: emptyMemberProfileFormValues(),
      });
      mockWizard.mockReturnValue(
        baseWizardState({ shellError: new Error('Profile load failed'), form })
      );
      return <ProfileCompletionWizardPage />;
    }

    it('shows shell error message when shellError is set', () => {
      render(<ShellErrorPage />);
      expect(screen.getByRole('alert')).toHaveTextContent(/Profile load failed/);
    });

    function SaveErrorPage() {
      const form = useZodForm({
        schema: memberProfileWizardSchema,
        defaultValues: emptyMemberProfileFormValues(),
      });
      mockWizard.mockReturnValue(
        baseWizardState({ saveStatus: 'error', saveErrorMessage: 'Could not save a phone number.', form })
      );
      return <ProfileCompletionWizardPage />;
    }

    it('shows save failed when saveStatus is error', () => {
      render(<SaveErrorPage />);
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      expect(screen.getByText(/could not save a phone number/i)).toBeInTheDocument();
    });

    it('renders final-step actions on the last step', async () => {
      const user = userEvent.setup();
      const cancel = vi.fn();

      function FinalStepPage() {
        const form = useZodForm({
          schema: memberProfileWizardSchema,
          defaultValues: emptyMemberProfileFormValues(),
        });
        mockWizard.mockReturnValue(
          baseWizardState({
            currentStep: 2,
            progressValue: 100,
            cancel,
            form,
          })
        );
        return <ProfileCompletionWizardPage />;
      }

      render(<FinalStepPage />);

      expect(screen.getByRole('button', { name: /^skip$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });
});
