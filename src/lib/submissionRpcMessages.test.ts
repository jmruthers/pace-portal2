import { describe, expect, it } from 'vitest';
import { mapSubmissionRpcMessage } from '@/lib/submissionRpcMessages';

describe('mapSubmissionRpcMessage', () => {
  it('maps base_application_duplicate to readable copy', () => {
    expect(mapSubmissionRpcMessage('base_application_duplicate')).toMatch(/already submitted/i);
  });

  it('maps registration type org mismatch to readable copy', () => {
    expect(mapSubmissionRpcMessage('validation_error.registration_type_org_mismatch')).toMatch(
      /registration type/i
    );
  });

  it('maps eligibility_denied variants', () => {
    expect(mapSubmissionRpcMessage('eligibility_denied.registration_type_not_eligible:Youth only')).toMatch(
      /not eligible/i
    );
  });

  it('maps base_application_permission_denied for delegated submit', () => {
    expect(mapSubmissionRpcMessage('base_application_permission_denied')).toMatch(/not permitted/i);
  });

  it('maps base_application_eligibility_failed', () => {
    expect(mapSubmissionRpcMessage('base_application_eligibility_failed')).toMatch(/not eligible/i);
  });

  it('falls back for unknown machine codes', () => {
    expect(mapSubmissionRpcMessage('validation_error.some_new_code')).toMatch(/could not be submitted/i);
  });

  it('preserves human messages', () => {
    expect(mapSubmissionRpcMessage('Network timeout')).toBe('Network timeout');
  });
});
