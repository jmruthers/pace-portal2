import { useMutation } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { err, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  submitEventApplication,
  type EventSubmissionErrorCode,
  type SubmitEventApplicationInput,
  type SubmitEventApplicationResult,
} from '@/lib/eventApplicationSubmission';

export type SubmissionUiMessage = {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
};

export function mapSubmissionErrorToToast(code: EventSubmissionErrorCode, message: string): SubmissionUiMessage {
  switch (code) {
    case 'MISSING_ORG_CONTEXT':
      return {
        title: 'Organisation required',
        description: 'Select an organisation before submitting.',
        variant: 'destructive',
      };
    case 'PROXY_RESOLUTION_FAILED':
      return {
        title: 'Delegated submission',
        description: message || 'Could not verify the member you are assisting.',
        variant: 'destructive',
      };
    case 'DUPLICATE_SUBMIT_PREVENTED':
      return {
        title: 'Already submitted',
        description: message || 'You already have an application for this event.',
        variant: 'destructive',
      };
    case 'PARTIAL_PERSISTENCE':
      return {
        title: 'Submission incomplete',
        description: message || 'Something went wrong while saving. Please retry or contact support.',
        variant: 'destructive',
      };
    case 'RESPONSE_PERSISTENCE_FAILED':
      return {
        title: 'Could not save answers',
        description: message || 'Your answers could not be saved.',
        variant: 'destructive',
      };
    case 'VALIDATION_FAILED':
      return {
        title: 'Cannot submit',
        description: message || 'This form cannot be submitted right now.',
        variant: 'destructive',
      };
    case 'APPLICATION_RPC_FAILED':
    default:
      return {
        title: 'Submission failed',
        description: message || 'Could not submit your application.',
        variant: 'destructive',
      };
  }
}

export function useApplicationSubmission(
  input: Omit<SubmitEventApplicationInput, 'client' | 'formValues'> | null
) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const mutation = useMutation({
    mutationFn: async (formValues: Record<string, unknown>): Promise<ApiResult<SubmitEventApplicationResult>> => {
      if (!client || !input) {
        return err({
          code: 'VALIDATION_FAILED',
          message: 'Your session could not be verified. Please sign in again.',
        });
      }
      return submitEventApplication({
        ...input,
        client,
        formValues,
      });
    },
  });

  return {
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    resetSubmission: mutation.reset,
    lastResult: mutation.data,
  };
}
