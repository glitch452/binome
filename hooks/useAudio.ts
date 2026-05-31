import { useCallback, useRef } from 'react';

import { SOUND_PATHS } from '@/lib/constants';
import type { SoundId } from '@/types/timer';

export interface UseAudioReturn {
  prime: () => void;
  play: (soundId: SoundId) => void;
}

export function useAudio(): UseAudioReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<SoundId, AudioBuffer>>>({});

  /** Must be called within a user-gesture handler to satisfy browser autoplay policy. */
  const prime = useCallback(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
      return;
    }
    audioCtxRef.current = new AudioContext();
  }, []);

  const playAsync = useCallback(async (soundId: SoundId) => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      let buffer = buffersRef.current[soundId];
      if (!buffer) {
        const response = await fetch(SOUND_PATHS[soundId]);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        // eslint-disable-next-line require-atomic-updates -- concurrent play is safe: audio buffers are idempotently decoded
        buffersRef.current[soundId] = decoded;
        buffer = decoded;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // ignore audio playback errors
    }
  }, []);

  const play = useCallback(
    (soundId: SoundId) => {
      void playAsync(soundId);
    },
    [playAsync],
  );

  return { prime, play };
}
