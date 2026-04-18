import { describe, expect, it } from 'vitest';
import { findDietTypeById } from '@/hooks/medical-profile/cakeDietTypes';

describe('findDietTypeById', () => {
  const rows = [
    {
      diettype_id: '14',
      diettype_code: 'X',
      diettype_name: 'Fourteen',
      diettype_description: null,
    },
  ];

  it('matches UUID last segment decimal to short numeric id', () => {
    const id = '00000000-0000-0000-0000-000000000014';
    expect(findDietTypeById(rows, id)?.diettype_name).toBe('Fourteen');
  });

  it('matches exact id string', () => {
    expect(findDietTypeById(rows, '14')?.diettype_name).toBe('Fourteen');
  });
});
