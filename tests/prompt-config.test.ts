import assert from 'node:assert/strict';
import { resolveActivePrompt } from '@/lib/prompt-config';

const fallback = resolveActivePrompt([], '9.9.9');
assert.equal(fallback.version, '9.9.9');

const active = resolveActivePrompt([
  { id: '1', version: '1.0.0', isActive: false, instructions: 'old', createdAt: '2026-01-01' },
  { id: '2', version: '1.1.0', isActive: true, instructions: 'new', createdAt: '2026-01-02' },
]);
assert.equal(active.version, '1.1.0');
assert.equal(active.instructions, 'new');

console.log('prompt-config.test.ts passed');
