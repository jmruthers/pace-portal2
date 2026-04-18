import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  EventApplicationPlaceholderPage,
  EventHubPlaceholderPage,
} from '@/pages/public/EventWorkflowPlaceholders';

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

  it('renders event hub for non-reserved slug when event exists', () => {
    render(
      <MemoryRouter initialEntries={['/summer-camp']}>
        <Routes>
          <Route path="/:eventSlug" element={<EventHubPlaceholderPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /event/i })).toBeInTheDocument();
    expect(screen.getByText(/summer-camp/)).toBeInTheDocument();
  });

  it('renders not-found when event code does not resolve', () => {
    resolveMock.mockReturnValue('missing');
    render(
      <MemoryRouter initialEntries={['/notreal']}>
        <Routes>
          <Route path="/:eventSlug" element={<EventHubPlaceholderPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('renders not-found for reserved slug on hub route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/:eventSlug" element={<EventHubPlaceholderPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
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
