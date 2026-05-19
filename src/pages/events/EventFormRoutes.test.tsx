import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventApplicationRoute, EventFormRoute } from '@/pages/events/EventFormRoutes';

vi.mock('@/pages/events/FormFillPage', () => ({
  FormFillPage: () => <div data-testid="form-fill-mock">FORM</div>,
}));

function shell(path: string, children: ReactNode) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div data-testid="suspense-fallback">loading</div>}>{children}</Suspense>
    </MemoryRouter>
  );
}

describe('EventFormRoutes', () => {
  it('returns NotFound for reserved event slug on application route', async () => {
    render(
      shell(
        '/dashboard/application',
        <Routes>
          <Route path=":eventSlug/application" element={<EventApplicationRoute />} />
        </Routes>
      )
    );
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('renders FormFillPage for a normal event slug on application route', async () => {
    render(
      shell(
        '/summer-camp/application',
        <Routes>
          <Route path=":eventSlug/application" element={<EventApplicationRoute />} />
        </Routes>
      )
    );
    expect(await screen.findByTestId('form-fill-mock')).toBeInTheDocument();
  });

  it('returns NotFound when event slug is reserved on explicit form route', async () => {
    render(
      shell(
        '/dashboard/reg-form',
        <Routes>
          <Route path=":eventSlug/:formSlug" element={<EventFormRoute />} />
        </Routes>
      )
    );
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('renders FormFillPage for normal event and form slugs', async () => {
    render(
      shell(
        '/summer-camp/registration',
        <Routes>
          <Route path=":eventSlug/:formSlug" element={<EventFormRoute />} />
        </Routes>
      )
    );
    expect(await screen.findByTestId('form-fill-mock')).toBeInTheDocument();
  });
});
