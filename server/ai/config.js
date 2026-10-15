import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
export function loadAiConfig() {
  let local = {};
  try {
    local = parseEnv(
      readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return {
    key: process.env.GEMINI_API_KEY || local.GEMINI_API_KEY || '',
    model:
      process.env.GEMINI_MODEL || local.GEMINI_MODEL || 'gemini-flash-latest',
  };
}
