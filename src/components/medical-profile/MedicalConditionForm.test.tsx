import type { ComponentProps } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FileReference } from '@solvera/pace-core/types';
import { MedicalConditionForm } from '@/components/medical-profile/MedicalConditionForm';

const createMutate = vi.fn().mockResolvedValue('new-c');
const updateMutate = vi.fn().mockResolvedValue(undefined);
type ActionPlanQueryState = {
  data: {
    actionPlanDate: string | null;
    fileReference: FileReference | null;
  };
  isLoading: false,
  isError: false,
  isPending: false,
  error: null,
};

function createActionPlanQueryState(): ActionPlanQueryState {
  return {
    data: {
      actionPlanDate: null,
      fileReference: null,
    },
    isLoading: false,
    isError: false,
    isPending: false,
    error: null,
  };
}

const useActionPlanForConditionMock = vi.fn<(conditionId: string | null) => ActionPlanQueryState>(() =>
  createActionPlanQueryState()
);

const actionPlanMocks = vi.hoisted(() => ({
  persistActionPlanFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/medical-profile/useActionPlanFileAttachment', () => ({
  useActionPlanFileAttachment: () => ({
    persistActionPlanFile: actionPlanMocks.persistActionPlanFile,
    isReady: true,
  }),
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
  useActionPlanForCondition: (conditionId: string | null) => useActionPlanForConditionMock(conditionId),
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
    actionPlanMocks.persistActionPlanFile.mockClear();
    actionPlanMocks.persistActionPlanFile.mockResolvedValue(undefined);
    useActionPlanForConditionMock.mockReturnValue(createActionPlanQueryState());
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
          file_metadata: { fileName: 'plan.pdf', fileType: 'application/pdf', bucket: 'files' },
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

  it('shows validation feedback when saving without selecting a condition type', async () => {
    const user = setupUser();
    renderForm();

    await user.click(screen.getByRole('button', { name: /save condition/i }));

    expect(await screen.findByText(/select a condition type/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('shows action-plan validation error for unsupported files without uploading', () => {
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
        action_plan_file_id: null,
        action_plan_date: null,
        is_active: true,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
      } as never,
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const bad = new File([new Uint8Array([1])], 'bad.exe', { type: 'application/x-msdownload' });
    fireEvent.change(input, { target: { files: [bad] } });

    expect(screen.getByText(/PDF or image file/i)).toBeInTheDocument();
    expect(actionPlanMocks.persistActionPlanFile).not.toHaveBeenCalled();
  });

  it('uploads a valid action-plan file via persistActionPlanFile', async () => {
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
        action_plan_file_id: null,
        action_plan_date: null,
        is_active: true,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
      } as never,
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = new File([new Uint8Array([1])], 'plan.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdf] } });

    await waitFor(() => {
      expect(actionPlanMocks.persistActionPlanFile).toHaveBeenCalledWith({
        pendingFile: pdf,
        conditionId: 'cond-1',
        appId: 'app-1',
        organisationId: 'org-1',
      });
    });
  });
});
