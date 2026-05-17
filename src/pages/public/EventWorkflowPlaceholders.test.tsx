import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventApplicationPlaceholderPage } from '@/pages/public/EventWorkflowPlaceholders';

const resolveMock = vi.hoisted(() =>
  vi.fn((): 'loading' | 'found' | 'missing' | 'error' | 'idle' => 'found')
);

vi.mock('@/shared/hooks/useResolveEventByCode', () => ({
  useResolveEventByCode: resolveMock,
}));

describe('EventWorkflowPlaceholders', () => {
  beforeEach(() => {
    resolveMock.mockReturnValue('found');
  });

  it('renders application placeholder for two-segment path', () => {
    render(
      <MemoryRouter initialEntries={['/summer-camp/application']}>
        <Routes>
          <Route path="/:eventSlug/application" element={<EventApplicationPlaceholderPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
  });
});
