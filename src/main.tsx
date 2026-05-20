import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { setupRBAC } from '@solvera/pace-core/rbac';
import { UnifiedAuthProvider, useUnifiedAuthContext } from '@solvera/pace-core';
import { SessionRestorationLoader, ToastProvider } from '@solvera/pace-core/components';
import {
  renderShellInactivityWarning,
  SHELL_IDLE_TIMEOUT_MS,
  SHELL_WARN_BEFORE_MS,
} from '@/appShellAuthConfig';
import { OrganisationServiceProvider } from '@solvera/pace-core/providers';
import { QueryRetryHandler, queryErrorHandler } from '@solvera/pace-core/utils';
import { APP_NAME } from '@/constants';
import { resolveRbacAppIdForSetup } from '@/lib/rbacResolveAppId';
import { supabaseClient } from '@/lib/supabase';
import './App.css';
import App from './App';

/** Required for selected org/event context in headers, guards, and dashboard hooks. */
function AppWithOrganisation() {
  const { user, session } = useUnifiedAuthContext();
  return (
    <OrganisationServiceProvider supabaseClient={supabaseClient} user={user} session={session}>
      <App />
    </OrganisationServiceProvider>
  );
}

function getRbacAppId(appName: string) {
  return resolveRbacAppIdForSetup(supabaseClient, appName);
}

setupRBAC(supabaseClient, {
  appName: APP_NAME,
  getAppId: getRbacAppId,
});

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
const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ToastProvider>
        <UnifiedAuthProvider
          supabaseClient={supabaseClient}
          appName={APP_NAME}
          idleTimeoutMs={SHELL_IDLE_TIMEOUT_MS}
          warnBeforeMs={SHELL_WARN_BEFORE_MS}
          onIdleLogout={async () => {
            await supabaseClient.auth.signOut();
          }}
          renderInactivityWarning={renderShellInactivityWarning}
        >
          <SessionRestorationLoader message="Restoring session…">
            <AppWithOrganisation />
          </SessionRestorationLoader>
        </UnifiedAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
