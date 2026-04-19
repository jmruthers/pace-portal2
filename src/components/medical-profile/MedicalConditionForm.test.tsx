import type { ComponentProps } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MedicalConditionForm } from '@/components/medical-profile/MedicalConditionForm';

const createMutate = vi.fn().mockResolvedValue('new-c');
const updateMutate = vi.fn().mockResolvedValue(undefined);
const useActionPlanForConditionMock = vi.fn(() => ({
  data: { actionPlanDate: null, fileReference: null },
  isLoading: false,
  isError: false,
  isPending: false,
  error: null,
}));

vi.mock('@/hooks/medical-profile/useMedicalConditions', () => ({
  useMedicalConditions: () => ({
    createCondition: { mutateAsync: createMutate, isPending: false },
    updateCondition: { mutateAsync: updateMutate, isPending: false },
    deleteCondition: { mutateAsync: vi.fn(), isPending: false },
    isReady: true,
  }),
}));

vi.mock('@/hooks/medical-profile/useMediConditionTypes', () => ({
  useMediConditionTypes: () => ({
    data: [
      {
        id: 1,
        name: 'Respiratory',
        parent_id: null,
        created_at: null,
        created_by: null,
        is_active: true,
        updated_at: null,
        updated_by: null,
      },
      {
        id: 13,
        name: 'Archived Type',
        parent_id: null,
        created_at: null,
        created_by: null,
        is_active: false,
        updated_at: null,
        updated_by: null,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/medical-profile/useActionPlans', () => ({
  useActionPlanForCondition: (...args: unknown[]) => useActionPlanForConditionMock(...args),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
  toSupabaseClientLike: () => ({
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://example.com/plan.pdf' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/plan.pdf' } })),
      }),
    },
  }),
}));

function renderForm(props: Partial<ComponentProps<typeof MedicalConditionForm>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MedicalConditionForm
        open
        onOpenChange={() => {}}
        condition={null}
        profileId="mp1"
        organisationId="org-1"
        appId="app-1"
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('MedicalConditionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActionPlanForConditionMock.mockReturnValue({
      data: { actionPlanDate: null, fileReference: null },
      isLoading: false,
      isError: false,
      isPending: false,
      error: null,
    });
  });

  it('renders add-condition title when open without condition', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: /add medical condition/i })).toBeInTheDocument();
  });

  it('shows upload-after-save message when creating a new condition', () => {
    renderForm();
    expect(screen.getByText(/save this condition first, then upload an action plan file/i)).toBeInTheDocument();
  });

  it('shows a view-attachment link when a file reference exists', async () => {
    useActionPlanForConditionMock.mockReturnValue({
      data: {
        actionPlanDate: '2026-04-19',
        fileReference: {
          id: 'file-1',
          table_name: 'medi_condition',
          record_id: 'cond-1',
          file_path: 'org-1/medi_action_plans/medi_action_plan/cond-1/plan.pdf',
          file_metadata: { fileName: 'plan.pdf', fileType: 'application/pdf' },
          app_id: 'app-1',
          is_public: false,
          created_at: '',
          updated_at: '',
        },
      },
      isLoading: false,
      isError: false,
      isPending: false,
      error: null,
    });

    renderForm({
      condition: {
        id: 'cond-1',
        profile_id: 'mp1',
        condition_type_id: 1,
        name: 'Asthma',
        severity: 'Mild',
        medical_alert: false,
        diagnosed_by: null,
        diagnosed_date: null,
        treatment: null,
        medications_and_aids: null,
        triggers: null,
        emergency_protocol: null,
        notes: null,
        action_plan_file_id: 'file-1',
        action_plan_date: null,
        is_active: true,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
      } as never,
    });

    expect(await screen.findByRole('link', { name: /view attachment/i })).toBeInTheDocument();
  });

  it('shows the condition type label in edit mode instead of raw ID', () => {
    renderForm({
      condition: {
        id: 'cond-13',
        profile_id: 'mp1',
        condition_type_id: 13,
        name: 'Archived condition',
        severity: 'Mild',
        medical_alert: false,
        diagnosed_by: null,
        diagnosed_date: null,
        treatment: null,
        medications_and_aids: null,
        triggers: null,
        emergency_protocol: null,
        notes: null,
        action_plan_file_id: null,
        action_plan_date: null,
        is_active: true,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
      } as never,
    });

    const conditionTypeTrigger = screen.getByRole('button', { name: 'Condition type' });
    expect(conditionTypeTrigger).toHaveTextContent('Archived Type');
    expect(conditionTypeTrigger).not.toHaveTextContent('13');
  });
});
