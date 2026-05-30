import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import { useZodForm } from '@solvera/pace-core/hooks';
import { z } from '@solvera/pace-core/utils';
import { FormRendererConfirmations } from '@/components/events/FormRendererConfirmations';

const confirmationsSchema = z.object({
  confirmations: z.record(z.string(), z.boolean()).default({}),
});

vi.mock('@/hooks/auth/usePhoneNumbers', () => ({
  usePhoneNumbers: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/hooks/medical-profile/useMedicalProfileData', () => ({
  useMedicalProfileData: () => ({ data: null, isLoading: false, isError: false }),
}));

vi.mock('@/hooks/events/useFormAdditionalContactsPreview', () => ({
  useFormAdditionalContactsPreview: () => ({ data: [], isLoading: false, isError: false }),
}));

function Harness({ keys }: { keys: string[] }) {
  const form = useZodForm({
    schema: confirmationsSchema,
    defaultValues: { confirmations: {} },
  });
  return (
    <FormRendererConfirmations
      confirmationKeys={keys}
      personId="p1"
      memberId="m1"
      personFirstName="Alex"
      personLastName="Member"
      personEmail="alex@example.com"
      form={form as unknown as UseFormReturn<Record<string, unknown>>}
    />
  );
}

describe('FormRendererConfirmations (PR15/PR17 submit gate)', () => {
  it('renders nothing when no confirmation keys', () => {
    const { container } = render(<Harness keys={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows additional contacts confirmation with checkbox', () => {
    render(<Harness keys={['additional_contacts']} />);
    expect(screen.getByRole('heading', { name: /confirmations/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/additional contacts confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm my additional contacts are up to date/i)).toBeInTheDocument();
  });
});
