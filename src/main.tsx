import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { setupRBAC } from '@solvera/pace-core/rbac';
import { UnifiedAuthProvider, useUnifiedAuthContext } from '@solvera/pace-core';
import { InactivityWarningModal, SessionRestorationLoader, ToastProvider } from '@solvera/pace-core/components';
import { OrganisationServiceProvider } from '@solvera/pace-core/providers';
import { QueryRetryHandler, queryErrorHandler } from '@solvera/pace-core/utils';
import { supabaseClient } from '@/lib/supabase';
import { APP_NAME } from '@/constants';
import { LoginHistoryRecorder } from '@/shared/components/LoginHistoryRecorder';
import './app.css';
import App from './App';

setupRBAC(supabaseClient, { appName: APP_NAME });

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARN_BEFORE_MS = 2 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QueryRetryHandler,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => queryErrorHandler(error, 'Query'),
  }),
  mutationCache: new MutationCache({
    onError: (error) => queryErrorHandler(error, 'Mutation'),
  }),
});

function OrganisationToastShell() {
  const { user, session } = useUnifiedAuthContext();
  return (
    <OrganisationServiceProvider supabaseClient={supabaseClient} user={user} session={session}>
      <ToastProvider>
        <LoginHistoryRecorder />
        <App />
      </ToastProvider>
    </OrganisationServiceProvider>
  );
}

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UnifiedAuthProvider
          supabaseClient={supabaseClient}
          appName={APP_NAME}
          idleTimeoutMs={IDLE_TIMEOUT_MS}
          warnBeforeMs={WARN_BEFORE_MS}
          onIdleLogout={async () => {
            await supabaseClient.auth?.signOut();
          }}
          renderInactivityWarning={({ timeRemaining, onStaySignedIn, onSignOutNow }) => (
            <InactivityWarningModal
              isOpen
              timeRemaining={timeRemaining}
              onStaySignedIn={onStaySignedIn}
              onSignOutNow={onSignOutNow}
            />
          )}
        >
          <SessionRestorationLoader message="Restoring session…">
            <OrganisationToastShell />
          </SessionRestorationLoader>
        </UnifiedAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(<Root />);

export { APP_NAME } from '@/constants';
