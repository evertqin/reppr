/**
 * LLM provider abstraction. Used only by Node-side dev tools.
 * The browser app must NEVER import this file.
 */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompleteOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProvider {
  name: string;
  complete(messages: LlmMessage[], opts: LlmCompleteOptions): Promise<string>;
}

class OpenAIProvider implements LlmProvider {
  name = 'openai';
  async complete(messages: LlmMessage[], opts: LlmCompleteOptions): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned no content');
    return text;
  }
}

class AnthropicProvider implements LlmProvider {
  name = 'anthropic';
  async complete(messages: LlmMessage[], opts: LlmCompleteOptions): Promise<string> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const conv = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
        system,
        messages: conv,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Anthropic returned no content');
    return text;
  }
}

export function getProvider(name: string): LlmProvider {
  switch (name) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
