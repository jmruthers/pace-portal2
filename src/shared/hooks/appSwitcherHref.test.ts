import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAppSwitcherHref } from '@/shared/hooks/appSwitcherHref';

describe('buildAppSwitcherHref', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefixes slug when VITE_SUITE_APP_ORIGIN is set', () => {
    vi.stubEnv('VITE_SUITE_APP_ORIGIN', 'https://suite.example.com');
    expect(buildAppSwitcherHref('pace')).toBe('https://suite.example.com/pace');
  });

  it('uses root-relative path when origin is unset', () => {
    vi.stubEnv('VITE_SUITE_APP_ORIGIN', '');
    expect(buildAppSwitcherHref('pace')).toBe('/pace');
  });

  it('normalizes slug to lowercase', () => {
    vi.stubEnv('VITE_SUITE_APP_ORIGIN', '');
    expect(buildAppSwitcherHref('PACE')).toBe('/pace');
  });
});
