import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MedicalProfileDisplay } from '@/components/medical-profile/MedicalProfile/MedicalProfileDisplay';

describe('MedicalProfileDisplay', () => {
  it('shows empty state when there are no conditions', () => {
    render(<MedicalProfileDisplay conditions={[]} />);
    expect(screen.getByText('No conditions are recorded yet.')).toBeInTheDocument();
  });

  it('renders condition summary details', () => {
    render(
      <MedicalProfileDisplay
        conditions={[
          {
            id: 'c1',
            name: 'Asthma',
            is_active: false,
            severity: 'Severe',
            medical_alert: true,
          },
          {
            id: 'c2',
            name: null,
            is_active: true,
            severity: null,
            medical_alert: false,
          },
        ] as never}
      />
    );

    expect(screen.getByText('Asthma (inactive) — Severe — Medical alert')).toBeInTheDocument();
    expect(screen.getByText('Condition')).toBeInTheDocument();
  });
});

