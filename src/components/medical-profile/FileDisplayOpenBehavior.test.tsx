import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileDisplay } from '@solvera/pace-core/components';

describe('FileDisplay (PR11 inline open)', () => {
  it('opens with target blank and download fallback attributes when URL is known', () => {
    render(
      <FileDisplay
        url="https://example.com/docs/plan.pdf"
        label="Open action plan"
        fileReference={{
          id: 'r1',
          table_name: 'medi_action_plan',
          record_id: 'ap1',
          file_path: 'x/plan.pdf',
          file_metadata: { fileName: 'plan.pdf', fileType: 'application/pdf' },
          app_id: 'app',
          is_public: false,
          created_at: '',
          updated_at: '',
        }}
      />
    );

    const link = screen.getByRole('link', { name: /open action plan/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('download', 'plan.pdf');
  });
});
