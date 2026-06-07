import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('manifest', () => {
  it('is named Binome', () => {
    expect(manifest().name).toBe('Binome');
  });

  it('sets a short_name', () => {
    expect(manifest().short_name).toBe('Binome');
  });

  it('starts at the root', () => {
    expect(manifest().start_url).toBe('/');
  });

  it('scopes to the root', () => {
    expect(manifest().scope).toBe('/');
  });

  it('displays standalone', () => {
    expect(manifest().display).toBe('standalone');
  });

  it('sets the theme color', () => {
    expect(manifest().theme_color).toBe('#4f46e5');
  });

  it('sets the background color', () => {
    expect(manifest().background_color).toBe('#ffffff');
  });

  it('includes a 192x192 PNG icon', () => {
    expect(manifest().icons).toContainEqual(
      expect.objectContaining({ sizes: '192x192', type: 'image/png', purpose: 'any' }),
    );
  });

  it('includes a 512x512 PNG icon', () => {
    expect(manifest().icons).toContainEqual(
      expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'any' }),
    );
  });

  it('includes a maskable icon', () => {
    expect(manifest().icons).toContainEqual(expect.objectContaining({ purpose: 'maskable' }));
  });
});
