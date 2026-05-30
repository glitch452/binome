import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes via tailwind-merge', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('filters falsy values', () => {
    expect(cn('foo', false, undefined, 'bar')).toBe('foo bar');
  });
});
