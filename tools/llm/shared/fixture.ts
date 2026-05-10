import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { LlmCompleteOptions, LlmMessage, LlmProvider } from './provider';

export type FixtureMode = 'off' | 'record' | 'replay';

export function fixtureMode(): FixtureMode {
  const m = process.env.LLM_FIXTURE;
  if (m === 'record' || m === 'replay') return m;
  return 'off';
}

export function fixtureHash(messages: LlmMessage[], opts: LlmCompleteOptions): string {
  const h = createHash('sha256');
  h.update(JSON.stringify({ messages, opts }));
  return h.digest('hex').slice(0, 16);
}

/**
 * Wrap a provider so calls go through a fixture cache.
 *  - LLM_FIXTURE=record: writes the live response to fixturesDir/<hash>.txt
 *  - LLM_FIXTURE=replay: reads fixturesDir/<hash>.txt; throws if missing
 *  - LLM_FIXTURE unset/off: live call only
 */
export function withFixtures(provider: LlmProvider, fixturesDir: string): LlmProvider {
  return {
    name: `${provider.name}+fixture`,
    async complete(messages, opts) {
      const mode = fixtureMode();
      const hash = fixtureHash(messages, opts);
      const path = join(fixturesDir, `${hash}.txt`);
      if (mode === 'replay') {
        if (!existsSync(path)) {
          throw new Error(`Fixture missing: ${path}`);
        }
        return readFileSync(path, 'utf8');
      }
      const text = await provider.complete(messages, opts);
      if (mode === 'record') {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text, 'utf8');
      }
      return text;
    },
  };
}
