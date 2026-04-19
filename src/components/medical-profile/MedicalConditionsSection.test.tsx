import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MedicalConditionsSection } from '@/components/medical-profile/MedicalConditionsSection';

vi.mock('@/hooks/medical-profile/useMedicalConditions', () => ({
  useMedicalConditions: () => ({
    deleteCondition: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/hooks/medical-profile/useMediConditionTypes', () => ({
  useMediConditionTypes: vi.fn(() => ({
    data: [
      { id: 1, name: 'Respiratory', parent_id: null, is_active: true },
      { id: 2, name: 'Asthma', parent_id: 1, is_active: true },
    ],
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@/components/medical-profile/MedicalConditionForm', () => ({
  MedicalConditionForm: () => null,
}));

vi.mock('@/hooks/medical-profile/useActionPlans', () => ({
  useActionPlanForCondition: () => ({
    data: {
      actionPlanDate: '2024-06-01',
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
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toSupabaseClientLike: () => ({
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://example.com/plan.pdf' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/plan.pdf' } })),
      }),
    },
  }),
}));

const sampleCondition = {
  id: 'cond-1',
  profile_id: 'mp1',
  condition_type_id: 2,
  name: 'Asthma',
  severity: 'Severe' as const,
  medical_alert: true,
  diagnosed_by: 'Dr A',
  diagnosed_date: '2020-01-01',
  treatment: 'Inhaler',
  medications_and_aids: 'Salbutamol + spacer',
  triggers: 'Cold air',
  emergency_protocol: 'Call 000',
  notes: 'Carry spacer',
  action_plan_date: '2024-06-01',
  action_plan_file_id: null,
  is_active: true,
  created_at: '',
  created_by: '',
  updated_at: '',
  updated_by: '',
} as const;

describe('MedicalConditionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders simplified card content with type/severity/alert badges', async () => {
    render(
      <MedicalConditionsSection
        conditions={[{ ...sampleCondition, action_plan_file_id: 'file-1' }] as never}
        profileId="mp1"
        organisationId="org-1"
        appId="app-1"
      />
    );

    expect(screen.getByText(/Respiratory › Asthma/)).toBeInTheDocument();
    expect(screen.getByText('Medical alert')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /open attachment/i })).toBeInTheDocument();
    expect(screen.queryByText(/Treatment: Inhaler/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Diagnosed by:/)).not.toBeInTheDocument();
  });

  it('shows an attachment indicator when an action-plan file is linked', () => {
    render(
      <MedicalConditionsSection
        conditions={[{ ...sampleCondition, action_plan_file_id: 'file-1' }] as never}
        profileId="mp1"
        organisationId="org-1"
        appId="app-1"
      />
    );

    expect(screen.getByText('Attachment')).toBeInTheDocument();
  });
});
