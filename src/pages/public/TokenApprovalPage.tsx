import { useId } from 'react';
import { useParams } from 'react-router-dom';
import { Controller } from '@solvera/pace-core/forms';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  Label,
  LoadingSpinner,
  Textarea,
} from '@solvera/pace-core/components';
import { z } from '@solvera/pace-core/utils';
import { checkTypeHeading } from '@/hooks/approvals/tokenApprovalContracts';
import { TOKEN_APPROVAL_SUBMIT_FAILED, useTokenApproval } from '@/hooks/approvals/useTokenApproval';

const tokenApprovalDecisionSchema = z.object({
  rejectNotes: z.string(),
});

type TokenApprovalDecisionValues = z.infer<typeof tokenApprovalDecisionSchema>;

/**
 * PR20 — public token approval surface (BA07 RPCs only; no app chrome).
 * Lives under `public/` so route stays an intentionally unauthenticated surface (see portal-architecture).
 */
export function TokenApprovalPage() {
  const { token } = useParams();
  const headingId = useId();
  const rejectNotesFieldId = useId();
  const {
    phase,
    resolveContext,
    submitResult,
    terminalMessage,
    hasSubmitFailure,
    submitApproval,
    clearSubmitValidation,
  } = useTokenApproval(token);

  if (phase === 'missing_token') {
    return (
      <main
        className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4"
        aria-labelledby={headingId}
      >
        <h1 id={headingId} className="sr-only">
          Missing link
        </h1>
        <Alert variant="destructive">
          <AlertTitle>Missing link</AlertTitle>
          <AlertDescription>
            This approval link is incomplete. Check the message you were sent.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (phase === 'not_configured') {
    return (
      <main
        className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4"
        aria-labelledby={headingId}
      >
        <h1 id={headingId} className="sr-only">
          Unavailable
        </h1>
        <Alert variant="destructive">
          <AlertTitle>Unavailable</AlertTitle>
          <AlertDescription>Approvals are not available in this environment.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (phase === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center px-4" aria-busy="true" aria-labelledby={headingId}>
        <section className="grid place-items-center gap-4">
          <h1 id={headingId} className="sr-only">
            Loading approval
          </h1>
          <LoadingSpinner label="Loading approval…" />
        </section>
      </main>
    );
  }

  if (phase === 'terminal_invalid') {
    return (
      <main
        className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4"
        aria-labelledby={headingId}
      >
        <h1 id={headingId} className="sr-only">
          Link not available
        </h1>
        <Alert variant="destructive">
          <AlertTitle>Link not available</AlertTitle>
          <AlertDescription>{terminalMessage}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (phase === 'submitted' && submitResult) {
    const approved = submitResult.new_status === 'satisfied';
    return (
      <main
        className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4"
        aria-labelledby={headingId}
      >
        <h1 id={headingId} className="sr-only">
          {approved ? 'Thank you' : 'Response recorded'}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>{approved ? 'Thank you' : 'Response recorded'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {approved ? (
              <p>Your approval has been recorded. You can close this page.</p>
            ) : (
              <p>Your response has been recorded. You can close this page.</p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  if ((phase === 'ready' || phase === 'submit_validation' || phase === 'submitting') && resolveContext) {
    const isSubmitting = phase === 'submitting';
    const checkHeading = checkTypeHeading(resolveContext.check_type);

    return (
      <main
        className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4"
        aria-labelledby={headingId}
      >
        <h1 id={headingId} className="sr-only">
          {checkHeading}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>{checkHeading}</CardTitle>
          </CardHeader>
          <Form<TokenApprovalDecisionValues>
            key={resolveContext.check_id}
            schema={tokenApprovalDecisionSchema}
            defaultValues={{ rejectNotes: '' }}
            mode="onBlur"
            onSubmit={() => undefined}
          >
            {(methods) => (
              <>
                <CardContent className="grid gap-4">
                  <section>
                    <h2>Event</h2>
                    <p>{resolveContext.event_title}</p>
                  </section>
                  <section>
                    <h2>Applicant</h2>
                    <p>{resolveContext.applicant_display_name}</p>
                  </section>
                  <section>
                    <h2>Registration type</h2>
                    <p>{resolveContext.registration_type_name}</p>
                  </section>
                  {phase === 'submit_validation' ? (
                    <Alert variant="destructive">
                      <AlertTitle>Required</AlertTitle>
                      <AlertDescription>
                        Add a comment to explain your response when you choose not to approve.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {hasSubmitFailure ? (
                    <Alert variant="destructive">
                      <AlertTitle>Could not save</AlertTitle>
                      <AlertDescription>{TOKEN_APPROVAL_SUBMIT_FAILED}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Label htmlFor={rejectNotesFieldId} className="grid gap-1">
                    <span>Comments for rejection (required if you decline)</span>
                    <Controller
                      name="rejectNotes"
                      control={methods.control}
                      render={({ field }) => (
                        <Textarea
                          id={rejectNotesFieldId}
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            clearSubmitValidation();
                          }}
                          disabled={isSubmitting}
                          rows={4}
                          placeholder="Required when you choose not to approve."
                        />
                      )}
                    />
                  </Label>
                </CardContent>
                <CardFooter className="border-t border-border">
                  {isSubmitting ? (
                    <output aria-live="polite">
                      <LoadingSpinner label="Saving…" />
                    </output>
                  ) : (
                    <fieldset className="m-0 w-full border-0 p-0 text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() =>
                          submitApproval({
                            outcome: 'reject',
                            notes: methods.getValues('rejectNotes'),
                          })
                        }
                      >
                        Decline
                      </Button>{' '}
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => submitApproval({ outcome: 'approve' })}
                      >
                        Approve
                      </Button>
                    </fieldset>
                  )}
                </CardFooter>
              </>
            )}
          </Form>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center p-4">
      <LoadingSpinner label="Loading…" />
    </main>
  );
}
