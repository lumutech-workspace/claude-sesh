import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { replaceCredentials } from '../src/claude-credentials.js';

test('creates a backup before activating new credentials', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'claude-profile-')), '.credentials.json');
  await writeFile(path, '{"old":true}');
  await replaceCredentials(path, '{"new":true}');
  assert.equal(await readFile(path, 'utf8'), '{"new":true}');
  assert.equal(await readFile(`${path}.backup`, 'utf8'), '{"old":true}');
});

test('preserves current file when new credentials are not valid JSON', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'claude-profile-')), '.credentials.json');
  await writeFile(path, '{"old":true}');
  await assert.rejects(() => replaceCredentials(path, 'invalido'));
  assert.equal(await readFile(path, 'utf8'), '{"old":true}');
});
