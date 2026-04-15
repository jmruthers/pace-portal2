import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  Progress,
} from '@solvera/pace-core/components';
import { useProfileCompletionWizard } from '@/hooks/auth/useProfileCompletionWizard';

/**
 * Profile completion wizard shell (PR05). Step field content is owned by PR06.
 *
 * Intentionally not wrapped in {@link PagePermissionGuard}: `rbac_check_permission_simplified`
 * evaluates `rbac_permissions_get` for resolved app pages and does not grant org-admin bypass on
 * that path, so missing `rbac_page_permissions` rows for `profile-complete` would block all roles
 * including onboarding. Access is enforced by `ProtectedRoute` in the app shell instead.
 */
export function ProfileCompletionWizardPage() {
  const w = useProfileCompletionWizard();
  const isLast = w.currentStep === w.totalSteps - 1;
  const stepTitle = w.stepLabels[w.currentStep] ?? 'Profile';

  return (
    <section aria-label="Profile completion wizard" className="mx-auto grid w-full max-w-(--app-width) gap-4 px-4 py-6">
      {w.isShellLoading ? (
        <output className="grid min-h-[40vh] place-items-center" aria-live="polite">
          <LoadingSpinner label="Loading profile data…" />
        </output>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Complete your profile</CardTitle>
            <CardDescription>
              Step {w.currentStep + 1} of {w.totalSteps}: {stepTitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Progress value={w.progressValue} max={100} />

            <section
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              role="list"
              aria-label="Wizard steps"
            >
              {w.stepLabels.map((label, i) => {
                const stepNumber = i + 1;
                const isActive = i === w.currentStep;
                const isFuture = i > w.currentStep;
                return (
                  <div key={label} className="min-w-0" role="listitem">
                    <Button
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      disabled={isFuture}
                      aria-current={isActive ? 'step' : undefined}
                      aria-label={`Step ${stepNumber} of ${w.totalSteps}: ${label}`}
                      className="w-full min-w-0 justify-start"
                      onClick={i < w.currentStep ? () => w.goToStep(i) : undefined}
                    >
                      {label}
                    </Button>
                  </div>
                );
              })}
            </section>

            {w.shellError != null ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {w.shellError instanceof Error ? w.shellError.message : 'Could not load profile data.'}
                </AlertDescription>
              </Alert>
            ) : null}

            {w.validationMessage != null ? (
              <Alert variant="destructive">
                <AlertTitle>Check this step</AlertTitle>
                <AlertDescription>{w.validationMessage}</AlertDescription>
              </Alert>
            ) : null}

            {w.saveStatus === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>Try again or return to the dashboard.</AlertDescription>
              </Alert>
            ) : null}

            <section className="grid gap-4 rounded-md border border-sec-200 p-4" aria-labelledby="profile-wizard-step-heading">
              <h2 id="profile-wizard-step-heading">{stepTitle}</h2>
              {w.currentStep === 0 ? (
                <output>
                  {w.person ? (
                    <>
                      <p>
                        {w.person.first_name} {w.person.last_name}
                      </p>
                      <p>{w.person.email}</p>
                    </>
                  ) : (
                    <p>No personal profile is linked to this account yet.</p>
                  )}
                </output>
              ) : null}
              {w.currentStep === 1 ? (
                <output>
                  <p>Phone numbers on file: {w.phones.length}</p>
                  <p>
                    Residential address:{' '}
                    {w.addressData.residential?.full_address ?? 'Not linked'}
                  </p>
                  {w.addressData.isUnresolved ? (
                    <p>Address lookup is still resolving or incomplete.</p>
                  ) : null}
                </output>
              ) : null}
              {w.currentStep === 2 ? (
                <output>
                  <p>
                    Membership type and number will be collected here. Membership details are optional for
                    completion.
                  </p>
                  {w.member ? (
                    <p>Membership record is on file.</p>
                  ) : (
                    <p>No membership record is on file yet.</p>
                  )}
                </output>
              ) : null}
            </section>
          </CardContent>
          <CardFooter className="text-right">
            <fieldset className="grid auto-cols-max grid-flow-col justify-end gap-2 border-0 p-0">
              {isLast ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={w.saveStatus === 'saving'}
                    onClick={() => void w.skipFinalStep()}
                  >
                    Skip
                  </Button>
                  <Button type="button" variant="outline" onClick={w.goToPrevious}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" onClick={w.cancel}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    disabled={w.saveStatus === 'saving'}
                    onClick={() => void w.completeProfile()}
                  >
                    {w.saveStatus === 'saving' ? 'Saving…' : 'Complete profile'}
                  </Button>
                </>
              ) : (
                <>
                  {w.currentStep > 0 ? (
                    <Button type="button" variant="outline" onClick={w.goToPrevious}>
                      Previous
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" onClick={w.cancel}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    disabled={w.saveStatus === 'saving'}
                    onClick={() => void w.saveAndContinue()}
                  >
                    {w.saveStatus === 'saving' ? 'Saving…' : 'Save and continue'}
                  </Button>
                </>
              )}
            </fieldset>
          </CardFooter>
        </Card>
      )}
    </section>
  );
}
