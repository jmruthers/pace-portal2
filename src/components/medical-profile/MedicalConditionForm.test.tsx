import type { ComponentProps } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MedicalConditionForm } from '@/components/medical-profile/MedicalConditionForm';

const createMutate = vi.fn().mockResolvedValue('new-c');
const updateMutate = vi.fn().mockResolvedValue(undefined);

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
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/medical-profile/useActionPlans', () => ({
  useActionPlanForCondition: () => ({
    data: { actionPlan: null, fileReference: null },
    isLoading: false,
    isError: false,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/hooks/medical-profile/useActionPlanFileAttachment', () => ({
  useActionPlanFileAttachment: () => ({
    persistActionPlanFile: vi.fn().mockResolvedValue(undefined),
    isReady: true,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
  toSupabaseClientLike: () => ({}),
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
  });

  it('renders add-condition title when open without condition', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: /add medical condition/i })).toBeInTheDocument();
  });

  it('shows file validation error for disallowed MIME type', async () => {
    renderForm();

    const section = screen.getByLabelText('Action plan document');
    const input = section.querySelector('input[type="file"]') as HTMLInputElement;
    const bad = new File([new Uint8Array([1])], 'x.exe', { type: 'application/x-msdownload' });
    fireEvent.change(input, { target: { files: [bad] } });

    await waitFor(() => {
      expect(section.textContent).toMatch(/PDF or image/i);
    });
  });
});
