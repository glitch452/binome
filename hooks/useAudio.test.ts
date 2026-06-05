import { act, renderHook } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

  describe('playRepeated', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('does nothing when called before prime', async () => {
      const { result } = renderHook(() => useAudio());
      await act(async () => {
        result.current.playRepeated('beep', 2);
        vi.runAllTimers();
        await Promise.resolve();
      });
      expect(mockCreateBufferSource).not.toHaveBeenCalled();
    });

    it('plays once when times is 1', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => result.current.prime());
      await act(async () => {
        result.current.playRepeated('beep', 1);
        vi.runAllTimers();
        await Promise.resolve();
      });
      expect(mockCreateBufferSource).toHaveBeenCalledTimes(1);
    });

    it('plays three times when times is 3', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => result.current.prime());
      await act(async () => {
        result.current.playRepeated('beep', 3);
        vi.runAllTimers();
        await Promise.resolve();
      });
      expect(mockCreateBufferSource).toHaveBeenCalledTimes(3);
    });

    it('cancelRepeated stops pending plays before they fire', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => result.current.prime());
      await act(async () => {
        result.current.playRepeated('beep', 3);
        result.current.cancelRepeated();
        vi.runAllTimers();
        await Promise.resolve();
      });
      expect(mockCreateBufferSource).not.toHaveBeenCalled();
    });

    it('a second playRepeated cancels the first sequence', async () => {
      const { result } = renderHook(() => useAudio());
      act(() => result.current.prime());
      await act(async () => {
        result.current.playRepeated('beep', 3);
        result.current.playRepeated('bell', 1);
        vi.runAllTimers();
        await Promise.resolve();
      });
      // Only the one play from the second call should have fired
      expect(mockCreateBufferSource).toHaveBeenCalledTimes(1);
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
