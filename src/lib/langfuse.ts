import Anthropic from '@anthropic-ai/sdk';
import { Langfuse } from 'langfuse';
import type { ModelId } from '@/lib/config';

if (!process.env.LANGFUSE_PUBLIC_KEY) {
  throw new Error('Missing env var: LANGFUSE_PUBLIC_KEY');
}
if (!process.env.LANGFUSE_SECRET_KEY) {
  throw new Error('Missing env var: LANGFUSE_SECRET_KEY');
}

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TracedCallParams {
  traceName: string;
  model: ModelId;
  maxTokens: number;
  system: string;
  userMessage: string;
  traceInput?: Record<string, unknown>;
}

// All Claude calls must go through this wrapper — it ensures every call
// is traced in Langfuse and errors are surfaced with full context.
export async function tracedClaudeCall(params: TracedCallParams): Promise<string> {
  const { traceName, model, maxTokens, system, userMessage, traceInput } = params;

  const trace = langfuse.trace({
    name: traceName,
    input: traceInput ?? { userMessage },
  });

  const generation = trace.generation({
    name: traceName,
    model,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
  });

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    generation.end({
      output: text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
        unit: 'TOKENS',
      },
    });
    trace.update({ output: text });

    return text;
  } catch (error) {
    generation.end({ level: 'ERROR', statusMessage: String(error) });
    trace.update({ output: String(error) });
    throw error;
  }
}
