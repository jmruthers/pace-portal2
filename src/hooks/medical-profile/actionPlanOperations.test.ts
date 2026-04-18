import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ok, err } from '@solvera/pace-core/types';
import {
  attachActionPlanFile,
  coreFileRowToFileReference,
  deleteActionPlansForCondition,
  ensureActionPlanRow,
  expectedStoragePathForActionPlan,
  fetchCurrentActionPlan,
  replaceActionPlanFile,
} from '@/hooks/medical-profile/actionPlanOperations';

const mocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  buildStoragePath: vi.fn((...args: unknown[]) => `path:${JSON.stringify(args)}`),
  deleteAttachment: vi.fn(),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  buildStoragePath: mocks.buildStoragePath,
  uploadFile: mocks.uploadFile,
}));

vi.mock('@solvera/pace-core/crud', () => ({
  deleteAttachment: mocks.deleteAttachment,
}));

function fileRef(id: string, path: string) {
  return {
    id,
    file_path: path,
    table_name: 'medi_action_plan',
    record_id: 'ap1',
    file_metadata: { fileName: 'a.pdf', fileType: 'application/pdf' },
    app_id: 'app1',
    is_public: false,
    created_at: '',
    updated_at: '',
  };
}

describe('actionPlanOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteAttachment.mockResolvedValue(ok(undefined));
  });

  it('coreFileRowToFileReference maps DB row to FileReference', () => {
    const ref = coreFileRowToFileReference(
      {
        id: 'r1',
        file_path: 'f/a.pdf',
        file_metadata: { fileName: 'a.pdf', fileType: 'application/pdf' },
        app_id: 'a',
        is_public: false,
        created_at: 't',
        updated_at: 't',
        table_name: 'medi_action_plan',
        record_id: 'x',
      } as never,
      'ap-z'
    );
    expect(ref.record_id).toBe('ap-z');
    expect(ref.file_path).toBe('f/a.pdf');
  });

  it('expectedStoragePathForActionPlan delegates to buildStoragePath', () => {
    const p = expectedStoragePathForActionPlan('ap99', 'doc.pdf');
    expect(mocks.buildStoragePath).toHaveBeenCalled();
    expect(p).toContain('path:');
    expect(p).toContain('doc.pdf');
  });

  it('fetchCurrentActionPlan returns row or null', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'ap1', condition_id: 'c1' }, error: null });
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ maybeSingle }),
            }),
          }),
        }),
      }),
    };
    const row = await fetchCurrentActionPlan(client as never, 'c1');
    expect(row?.id).toBe('ap1');
  });

  it('ensureActionPlanRow inserts when none exists', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'new-ap' }, error: null });
    const insertChain = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-ap' }, error: null }),
      }),
    };
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'medi_action_plan') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({ maybeSingle }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue(insertChain),
          };
        }
        return {};
      }),
    };

    const row = await ensureActionPlanRow({
      client: client as never,
      conditionId: 'c9',
      organisationId: 'org-9',
    });
    expect(row.id).toBe('new-ap');
  });

  it('attachActionPlanFile links upload to medi_action_plan', async () => {
    mocks.uploadFile.mockResolvedValue({
      file_reference: fileRef('fr-new', 'stor/new.pdf'),
    });
    const updateSingle = vi.fn().mockResolvedValue({ data: { id: 'ap1' }, error: null });
    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'medi_action_plan') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({ single: updateSingle }),
              }),
            }),
          };
        }
        if (table === 'core_file_references') {
          return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return {};
      }),
    };
    const supabase = { storage: { from: () => ({ remove: vi.fn().mockResolvedValue({}) }) } };

    const out = await attachActionPlanFile({
      supabase: supabase as never,
      typedClient: typedClient as never,
      actionPlanId: 'ap1',
      appId: 'app1',
      file: new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
    });
    expect(out.id).toBe('fr-new');
    expect(mocks.uploadFile).toHaveBeenCalled();
  });

  it('attachActionPlanFile rolls back storage and reference when FK update fails', async () => {
    mocks.uploadFile.mockResolvedValue({
      file_reference: fileRef('fr-bad', 'stor/bad.pdf'),
    });
    const remove = vi.fn().mockResolvedValue({});
    const delRef = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'medi_action_plan') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'fk fail' } }),
                }),
              }),
            }),
          };
        }
        if (table === 'core_file_references') {
          return { delete: delRef };
        }
        return {};
      }),
    };
    const supabase = { storage: { from: () => ({ remove }) } };

    await expect(
      attachActionPlanFile({
        supabase: supabase as never,
        typedClient: typedClient as never,
        actionPlanId: 'ap1',
        appId: 'app1',
        file: new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
      })
    ).rejects.toThrow(/fk fail/);
    expect(remove).toHaveBeenCalledWith(['stor/bad.pdf']);
  });

  it('replaceActionPlanFile deletes previous attachment after successful update', async () => {
    mocks.uploadFile.mockResolvedValue({
      file_reference: fileRef('fr-new', 'stor/new2.pdf'),
    });
    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'core_file_references') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { file_path: 'old/path.pdf' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'medi_action_plan') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'ap1' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    const supabase = { storage: { from: () => ({ remove: vi.fn() }) } };

    await replaceActionPlanFile({
      secure: {},
      supabase: supabase as never,
      typedClient: typedClient as never,
      actionPlan: {
        id: 'ap1',
        file_reference_id: 'fr-old',
      } as never,
      appId: 'app1',
      file: new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
    });

    expect(mocks.deleteAttachment).toHaveBeenCalled();
  });

  it('replaceActionPlanFile rolls back new upload when update fails', async () => {
    mocks.uploadFile.mockResolvedValue({
      file_reference: fileRef('fr-roll', 'stor/roll.pdf'),
    });
    const remove = vi.fn();
    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'core_file_references') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { file_path: 'old/x' }, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'medi_action_plan') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'nope' } }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    const supabase = { storage: { from: () => ({ remove }) } };

    await expect(
      replaceActionPlanFile({
        secure: {},
        supabase: supabase as never,
        typedClient: typedClient as never,
        actionPlan: { id: 'ap1', file_reference_id: 'fr-old' } as never,
        appId: 'app1',
        file: new File([new Uint8Array([1])], 'b.pdf', { type: 'application/pdf' }),
      })
    ).rejects.toThrow();
    expect(remove).toHaveBeenCalledWith(['stor/roll.pdf']);
  });

  it('replaceActionPlanFile throws when deleteAttachment fails', async () => {
    mocks.uploadFile.mockResolvedValue({
      file_reference: fileRef('fr-n', 'stor/n.pdf'),
    });
    mocks.deleteAttachment.mockResolvedValue(err({ message: 'delete failed', code: 'E' } as never));

    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'core_file_references') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { file_path: 'old/p' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'medi_action_plan') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'ap1' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    const supabase = { storage: { from: () => ({ remove: vi.fn() }) } };

    await expect(
      replaceActionPlanFile({
        secure: {},
        supabase: supabase as never,
        typedClient: typedClient as never,
        actionPlan: { id: 'ap1', file_reference_id: 'old' } as never,
        appId: 'app1',
        file: new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
      })
    ).rejects.toThrow(/delete failed/);
  });

  it('deleteActionPlansForCondition unlinks files and removes rows', async () => {
    const plans = [{ id: 'p1', file_reference_id: 'r1' }];
    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'medi_action_plan') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: plans, error: null }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'core_file_references') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { file_path: 'x/y.pdf' }, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    };

    await deleteActionPlansForCondition({
      secure: {},
      supabase: {} as never,
      typedClient: typedClient as never,
      conditionId: 'c1',
    });

    expect(mocks.deleteAttachment).toHaveBeenCalled();
  });

  it('deleteActionPlansForCondition deletes orphan reference row when path missing', async () => {
    const delEq = vi.fn().mockResolvedValue({ error: null });
    const typedClient = {
      from: vi.fn((table: string) => {
        if (table === 'medi_action_plan') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'p1', file_reference_id: 'r1' }], error: null }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'core_file_references') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({ eq: delEq }),
          };
        }
        return {};
      }),
    };

    await deleteActionPlansForCondition({
      secure: {},
      supabase: {} as never,
      typedClient: typedClient as never,
      conditionId: 'c1',
    });

    expect(delEq).toHaveBeenCalledWith('id', 'r1');
  });
});
