import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createStateStore } from '../src/state-store.js';

test('does not write secrets to state.json', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'claude-sesh-'));
  const state = createStateStore(directory);
  await state.upsert({ name: 'work', email: 'ana@company.com' });
  const content = await readFile(join(directory, 'state.json'), 'utf8');
  assert.equal(content.includes('accessToken'), false);
  assert.deepEqual((await state.read()).profiles, [{ name: 'work', email: 'ana@company.com' }]);
});

test('persists OAuth account identity for a complete profile', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'claude-sesh-'));
  const state = createStateStore(directory);
  await state.upsert({
    name: 'work',
    email: 'ana@company.com',
    oauthAccount: {
      emailAddress: 'ana@company.com',
      organizationUuid: 'org-1',
    },
  });

  const content = await readFile(join(directory, 'state.json'), 'utf8');
  assert.match(content, /organizationUuid/);
  assert.doesNotMatch(content, /accessToken|refreshToken/);
  assert.equal((await state.read()).profiles[0]?.oauthAccount?.organizationUuid, 'org-1');
});
