import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasSupabaseBrowserConfig } from '@/lib/supabaseBrowserEnv';
import {
  appBaseApplicationCheckResolveToken,
  appBaseApplicationCheckSubmit,
} from '@/lib/supabaseAnonRpc';
import {
  BA07_ERROR_MESSAGES,
  TOKEN_APPROVAL_LINK_UNAVAILABLE,
  parseResolvePayload,
  parseSubmitPayload,
  type TokenApprovalResolvePayload,
  type TokenApprovalSubmitPayload,
  isParticipantSafeTerminalResolveMessage,
  isParticipantSafeTerminalSubmitLookupMessage,
} from '@/hooks/approvals/tokenApprovalContracts';

export type TokenApprovalPhase =
  | 'missing_token'
  | 'not_configured'
  | 'loading'
  | 'terminal_invalid'
  | 'ready'
  | 'submit_validation'
  | 'submitting'
  | 'submitted';

type ResolveQueryRow =
  | { ok: true; data: TokenApprovalResolvePayload }
  | { ok: false; kind: 'terminal' }
  | { ok: false; kind: 'unexpected'; message: string };

async function fetchResolve(normalizedToken: string): Promise<ResolveQueryRow> {
  const { data, error } = await appBaseApplicationCheckResolveToken(normalizedToken);

  if (error) {
    const m = typeof error.message === 'string' ? error.message : '';
    if (isParticipantSafeTerminalResolveMessage(m)) {
      return { ok: false, kind: 'terminal' };
    }
    return {
      ok: false,
      kind: 'unexpected',
      message: m.length > 0 ? m : 'Could not load approval.',
    };
  }

  const parsed = parseResolvePayload(data);
  if (!parsed.ok) {
    return { ok: false, kind: 'terminal' };
  }
  return { ok: true, data: parsed.data };
}

export const TOKEN_APPROVAL_LOAD_FAILED = 'We could not load this page. Try again later.';

export const TOKEN_APPROVAL_SUBMIT_FAILED =
  'Your decision could not be saved. Try again.';

export type UseTokenApprovalResult = {
  phase: TokenApprovalPhase;
  resolveContext: TokenApprovalResolvePayload | null;
  submitResult: TokenApprovalSubmitPayload | null;
  /** User-visible terminal line when phase is terminal_invalid (participant-safe). */
  terminalMessage: string;
  /** Transient RPC failure on submit (non-token validation); use generic copy in UI. */
  hasSubmitFailure: boolean;
  submitApproval: (args: { outcome: 'approve' | 'reject'; notes?: string }) => void;
  clearSubmitValidation: () => void;
};

export function useTokenApproval(rawToken: string | undefined): UseTokenApprovalResult {
  const normalized = rawToken?.trim() ?? '';
  const configured = hasSupabaseBrowserConfig();
  const queryClient = useQueryClient();

  const [submitResult, setSubmitResult] = useState<TokenApprovalSubmitPayload | null>(null);
  const [submitValidation, setSubmitValidation] = useState(false);
  const [terminalFromSubmit, setTerminalFromSubmit] = useState(false);

  const queryKey = ['tokenApproval', 'resolve', normalized] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchResolve(normalized),
    enabled: normalized.length > 0 && configured && !submitResult && !terminalFromSubmit,
    staleTime: Infinity,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ outcome, notes }: { outcome: 'approve' | 'reject'; notes?: string }) => {
      const trimmedNotes = notes === undefined ? '' : notes.trim();
      if (outcome === 'reject' && trimmedNotes === '') {
        throw new Error(BA07_ERROR_MESSAGES.COMMENTS_REQUIRED_FOR_REJECT);
      }

      const pNotes =
        outcome === 'approve' ? (trimmedNotes === '' ? null : trimmedNotes) : trimmedNotes;

      const { data, error } = await appBaseApplicationCheckSubmit({
        p_raw_token: normalized,
        p_outcome: outcome,
        p_notes: pNotes,
      });

      if (error) {
        const m = typeof error.message === 'string' ? error.message : '';
        if (m === BA07_ERROR_MESSAGES.COMMENTS_REQUIRED_FOR_REJECT) {
          throw new Error(BA07_ERROR_MESSAGES.COMMENTS_REQUIRED_FOR_REJECT);
        }
        if (isParticipantSafeTerminalSubmitLookupMessage(m)) {
          throw new Error('__TERMINAL__');
        }
        throw new Error(m || 'Could not submit decision.');
      }

      const parsed = parseSubmitPayload(data);
      if (!parsed.ok) {
        throw new Error('__TERMINAL__');
      }
      return parsed.data;
    },
    onSuccess: (data) => {
      setSubmitResult(data);
      setSubmitValidation(false);
    },
    onError: (e: Error) => {
      if (e.message === BA07_ERROR_MESSAGES.COMMENTS_REQUIRED_FOR_REJECT) {
        setSubmitValidation(true);
        return;
      }
      if (e.message === '__TERMINAL__') {
        setTerminalFromSubmit(true);
        void queryClient.removeQueries({ queryKey });
      }
    },
  });

  const submitApproval = useCallback(
    (args: { outcome: 'approve' | 'reject'; notes?: string }) => {
      submitMutation.reset();
      if (args.outcome === 'reject' && (args.notes?.trim() ?? '') === '') {
        setSubmitValidation(true);
        return;
      }
      setSubmitValidation(false);
      submitMutation.mutate(args);
    },
    [submitMutation]
  );

  const clearSubmitValidation = useCallback(() => {
    setSubmitValidation(false);
  }, []);

  const row = query.data;

  const phase: TokenApprovalPhase = useMemo(() => {
    if (normalized === '') {
      return 'missing_token';
    }
    if (!configured) {
      return 'not_configured';
    }
    if (submitResult) {
      return 'submitted';
    }
    if (terminalFromSubmit) {
      return 'terminal_invalid';
    }
    if (submitMutation.isPending) {
      return 'submitting';
    }
    if (submitValidation) {
      return 'submit_validation';
    }
    if (query.isPending || query.isFetching) {
      return 'loading';
    }
    if (query.isError) {
      return 'terminal_invalid';
    }
    if (!row) {
      return 'terminal_invalid';
    }
    if (!row.ok) {
      return 'terminal_invalid';
    }
    return 'ready';
  }, [
    normalized,
    configured,
    submitResult,
    terminalFromSubmit,
    submitMutation.isPending,
    submitValidation,
    query.isPending,
    query.isFetching,
    query.isError,
    row,
  ]);

  const resolveContext =
    row?.ok === true && (phase === 'ready' || phase === 'submit_validation' || phase === 'submitting')
      ? row.data
      : null;

  const terminalMessage = useMemo(() => {
    if (query.isError) {
      return TOKEN_APPROVAL_LOAD_FAILED;
    }
    if (terminalFromSubmit) {
      return TOKEN_APPROVAL_LINK_UNAVAILABLE;
    }
    if (row?.ok === false && row.kind === 'terminal') {
      return TOKEN_APPROVAL_LINK_UNAVAILABLE;
    }
    if (row?.ok === false && row.kind === 'unexpected') {
      return TOKEN_APPROVAL_LOAD_FAILED;
    }
    return TOKEN_APPROVAL_LINK_UNAVAILABLE;
  }, [query.isError, terminalFromSubmit, row]);

  const hasSubmitFailure =
    submitMutation.isError &&
    !submitValidation &&
    !terminalFromSubmit &&
    submitMutation.error instanceof Error &&
    submitMutation.error.message !== BA07_ERROR_MESSAGES.COMMENTS_REQUIRED_FOR_REJECT &&
    submitMutation.error.message !== '__TERMINAL__';

  return {
    phase,
    resolveContext,
    submitResult,
    terminalMessage,
    hasSubmitFailure,
    submitApproval,
    clearSubmitValidation,
  };
}
