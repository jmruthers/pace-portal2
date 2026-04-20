import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactFormState } from '@/hooks/contacts/useContactFormState';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

const existingContact: GroupedAdditionalContact = {
  contact_id: 'c1',
  contact_person_id: 'p1',
  contact_type_id: 'ct-1',
  contact_type_name: 'Emergency',
  email: 'sam@example.com',
  first_name: 'Sam',
  last_name: 'Lee',
  member_id: 'm1',
  organisation_id: 'org-1',
  permission_type: 'view',
  phones: [{ phone_number: '0400', phone_type: 'Mobile' }],
};

describe('useContactFormState', () => {
  it('starts at email step in create mode', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'create', initialContact: null })
    );
    expect(result.current.step).toBe('email');
  });

  it('starts at full step with prefilled draft in edit mode', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'edit', initialContact: existingContact })
    );
    expect(result.current.step).toBe('full');
    expect(result.current.draft.first_name).toBe('Sam');
    expect(result.current.draft.contact_type_id).toBe('ct-1');
  });

  it('moves through match to relationship when link existing is chosen', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'create', initialContact: null })
    );

    act(() => {
      result.current.setMatchedPerson({
        person_id: 'p-match',
        first_name: 'Alex',
        last_name: 'Jones',
        preferred_name: 'AJ',
        email: 'alex@example.com',
        phone_number: '0400',
        phone_type_id: 1,
      });
      result.current.toMatchStep();
    });

    expect(result.current.step).toBe('match');

    act(() => {
      result.current.chooseLinkExistingPerson();
    });

    expect(result.current.step).toBe('relationship');
    expect(result.current.draft.match_person_id).toBe('p-match');
    expect(result.current.draft.link_existing_person).toBe(true);
  });

  it('sets blocked state with message and clears to email', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'create', initialContact: null })
    );

    act(() => {
      result.current.setBlocked('Duplicate contact');
    });
    expect(result.current.step).toBe('blocked');
    expect(result.current.blockedMessage).toBe('Duplicate contact');

    act(() => {
      result.current.clearBlocked();
    });
    expect(result.current.step).toBe('email');
    expect(result.current.blockedMessage).toBeNull();
  });

  it('applies relationship and full values into draft', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'create', initialContact: null })
    );

    act(() => {
      result.current.applyRelationship({
        contact_type_id: 'ct-1',
        permission_type: 'edit',
      });
    });
    expect(result.current.step).toBe('full');
    expect(result.current.draft.contact_type_id).toBe('ct-1');
    expect(result.current.draft.permission_type).toBe('edit');

    act(() => {
      result.current.applyFullValues({
        first_name: 'Alex',
        last_name: 'Jones',
        preferred_name: 'AJ',
        email: 'alex@example.com',
        phone_number: '0400',
        phone_type_id: 1,
        contact_type_id: 'ct-1',
        permission_type: 'edit',
      });
    });
    expect(result.current.draft.first_name).toBe('Alex');
    expect(result.current.draft.email).toBe('alex@example.com');
  });

  it('handles create path email/no-email and explicit step transitions', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'create', initialContact: null })
    );

    act(() => {
      result.current.setCreatePathHasEmail('sam@example.com');
      result.current.toMatchStep();
    });
    expect(result.current.draft.email).toBe('sam@example.com');
    expect(result.current.step).toBe('match');

    act(() => {
      result.current.setCreatePathNoEmail();
    });
    expect(result.current.draft.email).toBe('');
    expect(result.current.step).toBe('relationship');

    act(() => {
      result.current.toFullStep();
      result.current.toRelationshipStep();
      result.current.toEmailStep();
    });
    expect(result.current.step).toBe('email');
  });

  it('chooses create-new path from match', () => {
    const { result } = renderHook(() =>
      useContactFormState({ mode: 'create', initialContact: null })
    );

    act(() => {
      result.current.setMatchedPerson({
        person_id: 'p-match',
        first_name: 'Alex',
        last_name: 'Jones',
        preferred_name: null,
        email: 'alex@example.com',
        phone_number: null,
        phone_type_id: null,
      });
      result.current.toMatchStep();
      result.current.chooseCreateNewFromMatch();
    });

    expect(result.current.step).toBe('relationship');
    expect(result.current.draft.link_existing_person).toBe(false);
    expect(result.current.draft.match_person_id).toBeNull();
  });
});
