import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { Alert, AlertDescription, AlertTitle, LoadingSpinner } from '@solvera/pace-core/components';
import { useToast } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { MedicalProfileForm } from '@/components/medical-profile/MedicalProfile/MedicalProfileForm';
import { useMedicalReferenceData } from '@/hooks/medical-profile/useMedicalReferenceData';
import { useMedicalProfilePage } from '@/hooks/medical-profile/useMedicalProfilePage';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import {
  createMedicalProfileSchema,
  mapMediProfileRowToFormValues,
  type MedicalProfileFormValues,
} from '@/utils/medical-profile/validation';

function MedicalProfileContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const proxy = useProxyMode();
  /** Member reference lookups plus active `cake_diettype` rows for the dietary menu select. */
  const medicalRef = useMedicalReferenceData();
  const editor = useMedicalProfilePage();

  useEffect(() => {
    if (editor.blockedReason === 'needs_member_profile') {
      const q = new URLSearchParams({
        completeMemberFirst: '1',
        returnTo: '/medical-profile',
      });
      navigate(`/member-profile?${q.toString()}`, { replace: true });
    }
  }, [editor.blockedReason, navigate]);

  const formSchema = useMemo(
    () => createMedicalProfileSchema(medicalRef.dietTypes ?? []),
    [medicalRef.dietTypes]
  );

  const formKey = useMemo(() => {
    const p = editor.load.data?.profile;
    const n = medicalRef.dietTypes?.length ?? 0;
    return p ? `${p.id}-${editor.load.dataUpdatedAt}-d${n}` : `new-d${n}`;
  }, [editor.load.data?.profile, editor.load.dataUpdatedAt, medicalRef.dietTypes?.length]);

  const defaultValues = useMemo(() => {
    return mapMediProfileRowToFormValues(editor.load.data?.profile ?? null, medicalRef.dietTypes);
  }, [editor.load.data?.profile, medicalRef.dietTypes]);

  const handleSubmit = async (values: MedicalProfileFormValues) => {
    try {
      await editor.saveMedicalProfile(values);
      toast({ title: 'Medical profile saved', description: 'Your changes were saved.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save medical profile.';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    }
  };

  if (!organisationId) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Organisation required</AlertTitle>
          <AlertDescription>Select an organisation before editing your medical profile.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!editor.gateReady) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading…" />
      </main>
    );
  }

  if (editor.blockedReason === 'needs_member_profile') {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Redirecting…" />
      </main>
    );
  }

  if (editor.blockedReason === 'proxy_invalid') {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Delegated access</AlertTitle>
          <AlertDescription>
            {proxy.validationError ?? 'Delegated editing is not available for this session.'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (editor.load.isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading medical profile…" />
      </main>
    );
  }

  if (medicalRef.dietTypesLoading && medicalRef.dietTypes == null) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading diet options…" />
      </main>
    );
  }

  if (medicalRef.dietTypesError) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Diet options</AlertTitle>
          <AlertDescription>
            {medicalRef.dietTypesError.message ?? 'Could not load diet options.'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (editor.load.isError) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {editor.load.error instanceof Error ? editor.load.error.message : 'Could not load medical profile.'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const conditions = editor.load.data?.conditions ?? [];

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-6 p-4">
      <ProxyModeBanner />
      <MedicalProfileForm
        formKey={formKey}
        schema={formSchema}
        defaultValues={defaultValues}
        dietTypes={medicalRef.dietTypes ?? []}
        menuLabelHint={editor.load.data?.dietTypeNameFromRpc ?? null}
        conditions={conditions}
        profileId={editor.load.data?.profile?.id ?? null}
        organisationId={organisationId}
        appId={editor.appId ?? null}
        isSubmitting={editor.isSaving}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

/**
 * PR09 — Medical profile summary (self-service and proxy), readiness redirect, dual save actions.
 */
export function MedicalProfilePage() {
  return (
    <PagePermissionGuard
      pageName="medical-profile"
      operation="read"
      loading={
        <main className="grid min-h-[50vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <section aria-label="Medical profile summary">
        <MedicalProfileContent />
      </section>
    </PagePermissionGuard>
  );
}
