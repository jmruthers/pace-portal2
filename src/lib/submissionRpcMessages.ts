const RPC_MESSAGE_BY_CODE: Readonly<Record<string, string>> = {
  'base_application_duplicate':
    'You have already submitted an application for this event. Use Manage on the dashboard to view your application progress.',
  'validation_error.registration_type_org_mismatch':
    'This registration type is not set up for this event organisation. Ask the event team to review registration types and form bindings in admin.',
  'validation_error.organisation_context_mismatch':
    'Your selected organisation does not match what is required to submit this application. Switch to the event organisation in the app header and try again.',
  'validation_error.registration_type_not_found':
    'The registration type for this form could not be found. Ask the event team to check form bindings in admin.',
  'validation_error.registration_type_inactive':
    'This registration type is not currently open for applications.',
  'validation_error.registration_type_event_mismatch':
    'The registration type on this form does not belong to this event.',
  'validation_error.registration_type_not_permitted_for_form':
    'This form is not linked to the selected registration type. Ask the event team to check form bindings in admin.',
  'validation_error.form_response_contract_mismatch':
    'This application has already been submitted, or your saved answers no longer match this form. Refresh the page to review your submission, or use Manage on the dashboard.',
  'base_application_org_mismatch':
    'Your selected organisation does not match the event host organisation required to submit. Switch to the event organisation in the app header and try again.',
  'base_application_permission_denied':
    'You are not permitted to submit an application for this member. Check delegated access or contact your organisation.',
  'base_application_eligibility_failed':
    'This member is not eligible for the registration type required by this form. Review membership and date of birth, or contact the event team.',
  'base_application_scope_denied':
    'Your organisation is not permitted to register for this event.',
  'validation_error.applicant_person_not_found':
    'We could not find your member profile. Complete your profile and try again.',
  'scope_denied.registration_scope_not_permitted':
    'Your organisation is not permitted to register for this event.',
  'authorization_error.event_not_visible_for_applicant':
    'This event is not available for your organisation.',
  'authorization_error.application_create_denied':
    'You are not permitted to submit this application.',
  'eligibility_denied.registration_type_not_eligible':
    'You are not eligible for this registration type. Review the event requirements or choose a different type.',
};

function isMachineRpcCode(message: string): boolean {
  return /^(validation_error|scope_denied|authorization_error|eligibility_denied|base_application_)[a-z0-9_.:-]+$/i.test(
    message
  );
}

/** Maps BA05a RPC exception names to participant-safe copy. */
export function mapSubmissionRpcMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'Application could not be created.';
  }

  const direct = RPC_MESSAGE_BY_CODE[trimmed] ?? RPC_MESSAGE_BY_CODE[trimmed.toLowerCase()];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();
  for (const [code, message] of Object.entries(RPC_MESSAGE_BY_CODE)) {
    if (lower === code || lower.startsWith(`${code}:`)) {
      return message;
    }
  }

  if (lower.startsWith('eligibility_denied.')) {
    return RPC_MESSAGE_BY_CODE['eligibility_denied.registration_type_not_eligible']!;
  }
  if (lower.startsWith('scope_denied.')) {
    return RPC_MESSAGE_BY_CODE['scope_denied.registration_scope_not_permitted']!;
  }
  if (lower.startsWith('authorization_error.')) {
    return RPC_MESSAGE_BY_CODE['authorization_error.application_create_denied']!;
  }
  if (isMachineRpcCode(trimmed)) {
    return 'This application could not be submitted. Check your details and try again, or contact the event team if the problem continues.';
  }

  return trimmed;
}
