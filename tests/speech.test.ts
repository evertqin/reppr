import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSpeaker } from '../src/audio/speech';

interface MockUtterance {
  text: string;
  rate: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

class FakeSynth {
  spoken: MockUtterance[] = [];
  cancelled = 0;
  speak(u: MockUtterance) {
    this.spoken.push(u);
    // simulate async finish
    queueMicrotask(() => u.onend?.());
  }
  cancel() {
    this.cancelled++;
  }
  getVoices() {
    return [];
  }
  set onvoiceschanged(_: unknown) {
    // noop
  }
}

describe('speech', () => {
  let fake: FakeSynth;

  beforeEach(() => {
    fake = new FakeSynth();
    vi.stubGlobal('window', { speechSynthesis: fake });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      function MockUtt(text: string) {
        return { text, rate: 1, volume: 1, voice: null, onend: null, onerror: null };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queues sequential speak calls', async () => {
    const sp = createSpeaker();
    sp.speak('one');
    sp.speak('two');
    expect(fake.spoken.length).toBe(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.spoken.length).toBe(2);
    expect(fake.spoken.map((s) => s.text)).toEqual(['one', 'two']);
  });

  it('cancel clears the queue', () => {
    const sp = createSpeaker();
    sp.speak('one');
    sp.speak('two');
    sp.cancel();
    expect(fake.cancelled).toBe(1);
  });
});
