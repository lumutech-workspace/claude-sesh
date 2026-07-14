import { readFileSync } from 'node:fs';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

/** Versão atual do claude-sesh (fonte canônica: package.json). */
export const APP_VERSION: string = pkg.version;

/**
 * Versão do Claude Code validada como estável com esta release.
 * Atualizar manualmente a cada release após testar contra o Claude atual.
 */
export const COMPATIBLE_CLAUDE_VERSION = '2.1.81';
