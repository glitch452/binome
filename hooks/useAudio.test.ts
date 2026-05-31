import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAudio } from './useAudio';

describe('useAudio', () => {
  let MockAudioContext: ReturnType<typeof vi.fn>;
  let mockResume: ReturnType<typeof vi.fn>;
  let mockDecodeAudioData: ReturnType<typeof vi.fn>;
  let mockCreateBufferSource: ReturnType<typeof vi.fn>;
  let mockStart: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockResume = vi.fn().mockResolvedValue(undefined);
    mockDecodeAudioData = vi.fn().mockResolvedValue({});
    mockStart = vi.fn();
    mockCreateBufferSource = vi.fn(() => ({ buffer: null, connect: vi.fn(), start: mockStart }));

    // Regular function (not arrow) so `new AudioContext()` works correctly
    MockAudioContext = vi.fn(function MockAudioContextImpl() {
      return {
        state: 'running',
        destination: {},
        resume: mockResume,
        decodeAudioData: mockDecodeAudioData,
        createBufferSource: mockCreateBufferSource,
      };
    });

    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('prime', () => {
    it('creates an AudioContext when called', () => {
      const { result } = renderHook(() => useAudio());
      act(() => {
        result.current.prime();
      });
      expect(MockAudioContext).toHaveBeenCalledOnce();
    });

    it('does not create a second AudioContext on repeated calls', () => {
      const { result } = renderHook(() => useAudio());
      act(() => {
        result.current.prime();
      });
      act(() => {
        result.current.prime();
      });
      expect(MockAudioContext).toHaveBeenCalledOnce();
    });

    it('resumes a suspended context on second call', () => {
      const { result } = renderHook(() => useAudio());
      act(() => {
        result.current.prime();
      });
      Object.assign(MockAudioContext.mock.instances[0], { state: 'suspended' });
      act(() => {
        result.current.prime();
      });
      expect(mockResume).toHaveBeenCalled();
    });
  });

  describe('play', () => {
    it('does nothing when called before prime', async () => {
      const { result } = renderHook(() => useAudio());
      await act(async () => {
        result.current.play('beep');
        await Promise.resolve();
      });
      expect(mockCreateBufferSource).not.toHaveBeenCalled();
    });

    it('creates a buffer source after prime', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => {
        result.current.prime();
      });
      await act(async () => {
        result.current.play('beep');
        await Promise.resolve();
      });
      expect(mockCreateBufferSource).toHaveBeenCalled();
    });

    it('starts the buffer source node', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => {
        result.current.prime();
      });
      await act(async () => {
        result.current.play('beep');
        await Promise.resolve();
      });
      expect(mockStart).toHaveBeenCalled();
    });

    it('re-uses the cached buffer on the second play', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => {
        result.current.prime();
      });
      await act(async () => {
        result.current.play('beep');
        await Promise.resolve();
      });
      await act(async () => {
        result.current.play('beep');
        await Promise.resolve();
      });
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledOnce();
    });
  });
});
