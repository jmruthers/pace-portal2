import { lazy, Suspense, useMemo } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useSessionRestoration } from '@solvera/pace-core/hooks';
import { ProtectedRoute, LoadingSpinner } from '@solvera/pace-core/components';
import { AppErrorBoundary } from '@/shared/components/AppErrorBoundary';
import { OrganisationLoadingGate } from '@/shared/components/OrganisationLoadingGate';
import { PortalAuthenticatedLayout } from '@/shared/components/PortalAuthenticatedLayout';
import { ProfileCompleteLayout } from '@/shared/components/ProfileCompleteLayout';
import { isReservedEventSlug } from '@/routing/eventFormPaths';

const LoginPage = lazy(async () => {
  const m = await import('@/pages/auth/LoginPage');
  return { default: m.LoginPage };
});
const RegistrationPage = lazy(async () => {
  const m = await import('@/pages/public/RegistrationPage');
  return { default: m.RegistrationPage };
});
const DashboardPage = lazy(async () => {
  const m = await import('@/pages/DashboardPage');
  return { default: m.DashboardPage };
});
const ProfileCompletionWizardPage = lazy(async () => {
  const m = await import('@/pages/ProfileCompletionWizardPage');
  return { default: m.ProfileCompletionWizardPage };
});
const MemberProfilePage = lazy(async () => {
  const m = await import('@/pages/MemberProfilePage');
  return { default: m.MemberProfilePage };
});
const MedicalProfilePage = lazy(async () => {
  const m = await import('@/pages/MedicalProfilePage');
  return { default: m.MedicalProfilePage };
});
const AdditionalContactsPage = lazy(async () => {
  const m = await import('@/pages/AdditionalContactsPage');
  return { default: m.AdditionalContactsPage };
});
const ProfileViewPage = lazy(async () => {
  const m = await import('@/pages/ProfileViewPage');
  return { default: m.ProfileViewPage };
});
const ProfileEditProxyPage = lazy(async () => {
  const m = await import('@/pages/ProfileEditProxyPage');
  return { default: m.ProfileEditProxyPage };
});
const FormFillPage = lazy(async () => {
  const m = await import('@/pages/public/FormFillPage');
  return { default: m.FormFillPage };
});
const NotFoundPage = lazy(async () => {
  const m = await import('@/pages/NotFoundPage');
  return { default: m.NotFoundPage };
});

function RouteLoadingFallback() {
  return (
    <main className="grid min-h-screen place-items-center px-4" aria-busy="true">
      <section className="grid place-items-center gap-4">
        <LoadingSpinner label="Loading…" />
      </section>
    </main>
  );
}

function ProtectedRouteWithRedirect() {
  const location = useLocation();
  const redirectTarget = `${location.pathname}${location.search}`;
  const loginPath = useMemo(() => {
    if (redirectTarget === '/login' || redirectTarget.startsWith('/login?')) {
      return '/login';
    }
    return `/login?redirect=${encodeURIComponent(redirectTarget)}`;
  }, [redirectTarget]);

  return (
    <ProtectedRoute
      loginPath={loginPath}
      loadingFallback={
        <main className="grid min-h-screen place-items-center px-4" aria-busy="true">
          <section className="grid place-items-center gap-4">
            <LoadingSpinner label="Loading…" />
          </section>
        </main>
      }
    />
  );
}

function SessionRestorationHookProbe() {
  useSessionRestoration();
  return null;
}

function EventFormRoute() {
  const { eventSlug = '', formSlug = '' } = useParams();
  if (eventSlug === '' || formSlug === '') {
    return <NotFoundPage />;
  }
  if (isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }
  return <FormFillPage eventSlug={eventSlug} formSlug={formSlug} />;
}

function ProfileCompleteRoute() {
  return (
    <ProfileCompleteLayout>
      <ProfileCompletionWizardPage />
    </ProfileCompleteLayout>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SessionRestorationHookProbe />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/" element={<ProtectedRouteWithRedirect />}>
            <Route element={<OrganisationLoadingGate />}>
              <Route path="profile-complete" element={<ProfileCompleteRoute />} />
              <Route element={<PortalAuthenticatedLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="member-profile" element={<MemberProfilePage />} />
                <Route path="medical-profile" element={<MedicalProfilePage />} />
                <Route path="additional-contacts" element={<AdditionalContactsPage />} />
                <Route path="profile/view/:memberId" element={<ProfileViewPage />} />
                <Route path="profile/edit/:memberId" element={<ProfileEditProxyPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="/:eventSlug/:formSlug" element={<EventFormRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
