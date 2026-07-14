import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_VERSION, COMPATIBLE_CLAUDE_VERSION } from '../src/version-info.js';

test('APP_VERSION matches package.json version', async () => {
  const pkg = JSON.parse(
    await import('node:fs/promises').then((fs) => fs.readFile(new URL('../package.json', import.meta.url), 'utf8')),
  );
  assert.equal(APP_VERSION, pkg.version);
});

test('COMPATIBLE_CLAUDE_VERSION is a semantic version string', () => {
  assert.match(COMPATIBLE_CLAUDE_VERSION, /^\d+\.\d+\.\d+$/);
});
