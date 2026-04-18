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

const sampleCondition = {
  id: 'cond-1',
  profile_id: 'mp1',
  organisation_id: 'org-1',
  condition_type_id: 2,
  custom_name: null,
  name: 'Asthma',
  severity: 'High' as const,
  medical_alert: true,
  alert_description: 'Use inhaler',
  diagnosed_by: 'Dr A',
  diagnosed_date: '2020-01-01',
  last_episode_date: '2024-06-01',
  treatment: 'Inhaler',
  medication: 'Salbutamol',
  triggers: 'Cold air',
  emergency_protocol: 'Call 000',
  notes: 'Carry spacer',
  management_plan: 'Annual review',
  reaction: 'Wheeze',
  aid: 'Spacer',
  is_active: true,
  aid_field: '',
  created_at: '',
  created_by: '',
  updated_at: '',
  updated_by: '',
} as const;

describe('MedicalConditionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders high-signal condition summary including hierarchical type and clinical fields', () => {
    render(
      <MedicalConditionsSection
        conditions={[sampleCondition] as never}
        profileId="mp1"
        organisationId="org-1"
        appId="app-1"
      />
    );

    expect(screen.getByText(/Respiratory › Asthma/)).toBeInTheDocument();
    expect(screen.getByText(/Treatment: Inhaler/)).toBeInTheDocument();
    expect(screen.getByText(/Triggers: Cold air/)).toBeInTheDocument();
    expect(screen.getByText(/Emergency protocol: Call 000/)).toBeInTheDocument();
    expect(screen.getByText(/Notes: Carry spacer/)).toBeInTheDocument();
  });
});
