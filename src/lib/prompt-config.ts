import { PromptConfig } from '@/lib/db';

export interface ActivePrompt {
  version: string;
  instructions?: string;
}

export function resolveActivePrompt(configs: PromptConfig[], fallbackVersion = '1.0.0'): ActivePrompt {
  const active = configs.find((c) => c.isActive);
  if (!active) {
    return { version: fallbackVersion };
  }

  return {
    version: active.version,
    instructions: active.instructions,
  };
}
