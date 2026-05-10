/**
 * Thin wrapper around window.speechSynthesis with a small queue and cancel-on-skip.
 */
export interface SpeechOptions {
  voice?: string | null;
  rate?: number;
  volume?: number;
}

export interface Speaker {
  speak(text: string, opts?: SpeechOptions): void;
  cancel(): void;
  voices(): SpeechSynthesisVoice[];
}

export function createSpeaker(): Speaker {
  const synth: SpeechSynthesis | undefined =
    typeof window !== 'undefined' ? window.speechSynthesis : undefined;

  const queue: SpeechSynthesisUtterance[] = [];
  let speaking = false;

  function pump(): void {
    if (!synth) return;
    if (speaking) return;
    const next = queue.shift();
    if (!next) return;
    speaking = true;
    next.onend = () => {
      speaking = false;
      pump();
    };
    next.onerror = () => {
      speaking = false;
      pump();
    };
    synth.speak(next);
  }

  return {
    speak(text, opts = {}) {
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 1.0;
      u.volume = opts.volume ?? 1.0;
      if (opts.voice) {
        const v = synth.getVoices().find((vv) => vv.name === opts.voice);
        if (v) u.voice = v;
      }
      queue.push(u);
      pump();
    },
    cancel() {
      if (!synth) return;
      queue.length = 0;
      speaking = false;
      synth.cancel();
    },
    voices() {
      return synth ? synth.getVoices() : [];
    },
  };
}
