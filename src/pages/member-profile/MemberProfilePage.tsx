import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { createGoogleMapsJsAddressProviderAdapter } from '@solvera/pace-core/forms';
import type { AddressProviderAdapter } from '@solvera/pace-core/forms';
import { Alert, AlertDescription, AlertTitle, LoadingSpinner } from '@solvera/pace-core/components';
import { useToast } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { MemberProfileForm } from '@/components/member-profile/MemberProfile/MemberProfileForm';
import type { MemberProfileFormValues } from '@/components/member-profile/MemberProfile/MemberProfileForm';
import { ProfileSetupPrompt } from '@/components/member-profile/ProfileSetupPrompt';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loadGoogleMapsWithPlaces';
import { useMemberAdditionalFields } from '@/hooks/member-profile/useMemberAdditionalFields';
import { useAddressOperations } from '@/hooks/member-profile/useAddressOperations';
import {
  mapLoadModelToFormValues,
  useMemberProfileData,
} from '@/hooks/member-profile/useMemberProfileData';
import { normalizeMembershipStatus, usePersonOperations } from '@/hooks/member-profile/usePersonOperations';
import { bustCurrentPersonMemberCache } from '@/shared/lib/utils/userUtils';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';

const PROFILE_DEBUG_LOGS =
  import.meta.env.DEV || String(import.meta.env.VITE_PROFILE_DEBUG_LOGS ?? '') === 'true';

function profileDebugLog(step: string, data?: Record<string, unknown>): void {
  if (!PROFILE_DEBUG_LOGS) return;
  if (data) {
    console.info(`[member-profile][page] ${step}`, data);
    return;
  }
  console.info(`[member-profile][page] ${step}`);
}

function MemberProfileContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const medicalSummaryRedirect = searchParams.get('completeMemberFirst') === '1';

  const { data, isLoading, isError, error, dataUpdatedAt } = useMemberProfileData();
  const { data: referenceData, isLoading: refLoading } = useMemberAdditionalFields();
  const { saveAddressesAndPhones } = useAddressOperations();
  const { savePersonMember } = usePersonOperations();

  const [mapsReady, setMapsReady] = useState(false);
  const [addressProvider, setAddressProvider] = useState<AddressProviderAdapter | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!key || key.trim() === '') {
      setMapsReady(false);
      setAddressProvider(null);
      return;
    }
    let cancelled = false;
    void loadGoogleMapsWithPlaces()
      .then(() => {
        if (cancelled) return;
        setMapsReady(true);
        try {
          setAddressProvider(createGoogleMapsJsAddressProviderAdapter());
        } catch {
          setAddressProvider(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapsReady(false);
          setAddressProvider(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formKey = useMemo(() => {
    if (!data || data === 'needs_setup') return 'empty';
    return `${data.person.id}-${dataUpdatedAt}`;
  }, [data, dataUpdatedAt]);

  const defaultValues = useMemo(() => {
    if (!data || data === 'needs_setup') return null;
    return mapLoadModelToFormValues(data);
  }, [data]);

  const handleSubmit = async (values: MemberProfileFormValues) => {
    profileDebugLog('submit:start', {
      organisationId,
      hasExistingMember: Boolean(data && data !== 'needs_setup' && data.member?.id),
      hasExistingPerson: Boolean(data && data !== 'needs_setup' && data.person?.id),
    });
    if (!organisationId) {
      toast({ title: 'Organisation required', description: 'Select an organisation before saving.', variant: 'destructive' });
      return;
    }
    if (!data || data === 'needs_setup') return;

    setIsSaving(true);
    try {
      const person = data.person;
      const member = data.member;
      const splittingSharedPostalAddress =
        !values.postal_same_as_residential &&
        person.postal_address_id != null &&
        person.postal_address_id === person.residential_address_id;
      const { residentialAddressId, postalAddressId } = await saveAddressesAndPhones({
        organisationId,
        residential: values.residential,
        postal: values.postal_same_as_residential ? null : values.postal ?? null,
        postalSameAsResidential: values.postal_same_as_residential,
        residentialId: person.residential_address_id,
        postalId: values.postal_same_as_residential
          ? person.residential_address_id
          : splittingSharedPostalAddress
            ? null
            : person.postal_address_id,
        personId: person.id,
        phones: values.phones,
        existingPhoneIds: data.phones.map((p) => p.id),
      });

      const postalFinalId = values.postal_same_as_residential ? residentialAddressId : postalAddressId;

      await savePersonMember({
        personId: person.id,
        memberId: member?.id ?? null,
        organisationId,
        person: {
          first_name: values.first_name,
          last_name: values.last_name,
          middle_name: values.middle_name ?? null,
          preferred_name: values.preferred_name ?? null,
          email: values.email,
          date_of_birth: values.date_of_birth,
          gender_id: values.gender_id,
          pronoun_id: values.pronoun_id,
          residential_address_id: residentialAddressId,
          postal_address_id: postalFinalId,
        },
        member: {
          membership_type_id: values.membership_type_id,
          membership_number: values.membership_number ?? null,
          membership_status: normalizeMembershipStatus(member?.membership_status ?? null, values.membership_status),
        },
      });

      if (person.user_id) {
        bustCurrentPersonMemberCache(person.user_id, organisationId);
      }
      await queryClient.invalidateQueries({ queryKey: ['memberProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['enhancedLanding'] });
      profileDebugLog('submit:done', {
        personId: person.id,
        memberId: member?.id ?? null,
        organisationId,
      });
      toast({ title: 'Profile saved', description: 'Your changes were saved.' });
      navigate('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save profile.';
      profileDebugLog('submit:error', {
        organisationId,
        message: msg,
      });
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!organisationId) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Organisation required</AlertTitle>
          <AlertDescription>Select an organisation to edit your member profile.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (isLoading || refLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading profile…" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : 'Could not load profile.'}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (data === 'needs_setup') {
    return (
      <main className="grid gap-6 px-4">
        <h1>Member profile</h1>
        <ProfileSetupPrompt />
      </main>
    );
  }

  if (!defaultValues || !referenceData) {
    return null;
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-6 p-4">
      <h1>Member profile</h1>
      {medicalSummaryRedirect ? (
        <Alert>
          <AlertTitle>Complete your member profile first</AlertTitle>
          <AlertDescription>
            Finish your member profile details before returning to your medical summary. You can use your
            browser back navigation after saving, or open Medical profile from the menu again.
          </AlertDescription>
        </Alert>
      ) : null}
      <ProxyModeBanner />
      <MemberProfileForm
        formKey={formKey}
        defaultValues={defaultValues}
        referenceData={referenceData}
        addressProvider={mapsReady ? addressProvider : null}
        isSubmitting={isSaving}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

/**
 * Self-service member profile editor (PR07) — `PagePermissionGuard` + organisation context.
 */
export function MemberProfilePage() {
  return (
    <PagePermissionGuard
      pageName="member-profile"
      operation="read"
      loading={
        <main className="grid min-h-[50vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <section aria-label="Member profile self-service">
        <MemberProfileContent />
      </section>
    </PagePermissionGuard>
  );
}
