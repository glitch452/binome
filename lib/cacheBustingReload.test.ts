import { afterEach, describe, expect, it, vi } from 'vitest';

import { cacheBustingReload } from './cacheBustingReload';

function stubLocation(href: string): ReturnType<typeof vi.fn> {
  const replace = vi.fn();
  vi.stubGlobal('location', { href, replace });
  return replace;
}

function replacedUrl(replace: ReturnType<typeof vi.fn>): URL {
  return new URL(replace.mock.calls[0]?.[0] as string);
}

describe('cacheBustingReload', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls location.replace once', () => {
    const replace = stubLocation('http://localhost/');
    cacheBustingReload();
    expect(replace).toHaveBeenCalledOnce();
  });

  it('navigates to a URL carrying a _ cache-bust param', () => {
    const replace = stubLocation('http://localhost/');
    cacheBustingReload();
    expect(replacedUrl(replace).searchParams.has('_')).toBe(true);
  });

  it('does not stack a second _ param when one already exists', () => {
    const replace = stubLocation('http://localhost/?_=old');
    cacheBustingReload();
    expect(replacedUrl(replace).searchParams.getAll('_')).toHaveLength(1);
  });

  it('replaces a pre-existing _ value rather than keeping it', () => {
    const replace = stubLocation('http://localhost/?_=old');
    cacheBustingReload();
    expect(replacedUrl(replace).searchParams.get('_')).not.toBe('old');
  });

  it('preserves other existing search params', () => {
    const replace = stubLocation('http://localhost/?keep=1&_=old');
    cacheBustingReload();
    expect(replacedUrl(replace).searchParams.get('keep')).toBe('1');
  });

  it('does not throw when window is undefined (SSR guard)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => {
      cacheBustingReload();
    }).not.toThrow();
  });
});
