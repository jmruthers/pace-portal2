import type { Database } from '@/types/pace-database';

export type ValidateShellStepResult = { ok: true } | { ok: false; message: string };

export function buildCompletionPath(eventSlug: string | null, formSlug: string | null): string {
  if (eventSlug != null && formSlug != null) {
    return `/${encodeURIComponent(eventSlug)}/${encodeURIComponent(formSlug)}?fromWizard=true`;
  }
  return '/dashboard';
}

type ShellValidateCtx = {
  person: Database['public']['Tables']['core_person']['Row'] | null;
  phones: { phone_number: string }[];
  addressUnresolved: boolean;
};

/**
 * Shell-level checks only; PR06 adds field-group validation.
 */
export function validateShellStep(stepIndex: number, ctx: ShellValidateCtx): ValidateShellStepResult {
  if (stepIndex === 0) {
    if (ctx.person == null) {
      return {
        ok: false,
        message:
          'Your profile record is not available yet. Finish account setup or contact support if this continues.',
      };
    }
    const p = ctx.person;
    const okNames =
      typeof p.first_name === 'string' &&
      p.first_name.trim() !== '' &&
      typeof p.last_name === 'string' &&
      p.last_name.trim() !== '' &&
      typeof p.email === 'string' &&
      p.email.trim() !== '';
    if (!okNames) {
      return {
        ok: false,
        message: 'Personal details must include first name, last name, and email before you continue.',
      };
    }
    return { ok: true };
  }
  if (stepIndex === 1) {
    const hasPhone = ctx.phones.some((ph) => ph.phone_number.trim() !== '');
    if (!hasPhone) {
      return { ok: false, message: 'Add at least one phone number before you continue.' };
    }
    if (ctx.addressUnresolved) {
      return {
        ok: false,
        message: 'Residential address must be loaded and resolved before you continue.',
      };
    }
    return { ok: true };
  }
  return { ok: true };
}
