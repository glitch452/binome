import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { downloadJson } from './download';

const FAKE_OBJECT_URL = 'blob:fake-object-url';

describe('download', () => {
  let mockCreateObjectURL: MockInstance;
  let mockRevokeObjectURL: MockInstance;
  let capturedAnchor: HTMLAnchorElement | undefined;
  let anchorClickSpy: MockInstance | undefined;

  beforeEach(() => {
    capturedAnchor = undefined;
    anchorClickSpy = undefined;
    mockCreateObjectURL = vi.fn().mockReturnValue(FAKE_OBJECT_URL);
    mockRevokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- .bind captures the original before the spy replaces it; the deprecated overload is not invoked at runtime
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      // The mock accepts a plain string; cast is required because createElement has overloaded signatures.

      (tagName: string) => {
        const el = realCreateElement(tagName as keyof HTMLElementTagNameMap);
        if (tagName === 'a') {
          capturedAnchor = el as HTMLAnchorElement;
          anchorClickSpy = vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        }
        return el;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('downloadJson', () => {
    it('calls URL.createObjectURL with a Blob', () => {
      downloadJson('test.json', {});
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('sets the download attribute to the provided filename', () => {
      downloadJson('binome.json', {});
      expect(capturedAnchor?.download).toBe('binome.json');
    });

    it('clicks the anchor element', () => {
      downloadJson('test.json', {});
      expect(anchorClickSpy).toHaveBeenCalledOnce();
    });

    it('revokes the object URL after clicking', () => {
      downloadJson('test.json', {});
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(FAKE_OBJECT_URL);
    });

    it('serializes data with 2-space indentation', async () => {
      const data = { a: 1, b: [2, 3] };
      downloadJson('test.json', data);

      const blob = mockCreateObjectURL.mock.calls[0]?.[0] as Blob;
      const text = await blob.text();
      expect(text).toBe(JSON.stringify(data, null, 2));
    });
  });
});
