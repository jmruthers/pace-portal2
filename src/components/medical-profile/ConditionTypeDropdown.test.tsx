import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConditionTypeDropdown } from '@/components/medical-profile/ConditionTypeDropdown';

const types = [
  {
    id: 1,
    name: 'Breathing',
    parent_id: null,
    is_active: true,
    created_at: null,
    created_by: null,
    updated_at: null,
    updated_by: null,
  },
  {
    id: 2,
    name: 'Asthma',
    parent_id: 1,
    is_active: true,
    created_at: null,
    created_by: null,
    updated_at: null,
    updated_by: null,
  },
] as const;

describe('ConditionTypeDropdown', () => {
  it('renders options, filters by search, and calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ConditionTypeDropdown
        types={[...types]}
        value={1}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Breathing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Breathing › Asthma' })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /filter condition types/i }), 'asthma');

    expect(screen.queryByRole('button', { name: 'Breathing' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Breathing › Asthma' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows error text and disables controls', () => {
    render(
      <ConditionTypeDropdown
        types={[...types]}
        value={0}
        onChange={() => {}}
        disabled
        errorMessage="Select a condition type."
      />
    );

    expect(screen.getByRole('searchbox', { name: /filter condition types/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Breathing' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select a condition type.');
  });
});

