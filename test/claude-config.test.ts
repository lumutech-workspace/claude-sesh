import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  readClaudeConfig,
  replaceOAuthAccount,
  restoreClaudeConfig,
} from '../src/claude-config.js';

test('reads the current OAuth account', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'claude-profile-')), '.claude.json');
  await writeFile(path, JSON.stringify({ oauthAccount: { emailAddress: 'old@example.com', organizationUuid: 'org-1' } }));

  const snapshot = await readClaudeConfig(path);

  assert.deepEqual(snapshot.oauthAccount, { emailAddress: 'old@example.com', organizationUuid: 'org-1' });
});

test('replaces OAuth account without changing unrelated config', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'claude-profile-')), '.claude.json');
  await writeFile(path, JSON.stringify({ theme: 'dark', oauthAccount: { emailAddress: 'old@example.com' } }));

  await replaceOAuthAccount(path, { emailAddress: 'new@example.com', organizationUuid: 'org-2' });

  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), {
    theme: 'dark',
    oauthAccount: { emailAddress: 'new@example.com', organizationUuid: 'org-2' },
  });
});

test('restores the complete original config', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'claude-profile-')), '.claude.json');
  const original = '{"theme":"dark","oauthAccount":{"emailAddress":"old@example.com"}}';
  await writeFile(path, JSON.stringify({ theme: 'light', oauthAccount: { emailAddress: 'new@example.com' } }));

  await restoreClaudeConfig(path, original);

  assert.equal(await readFile(path, 'utf8'), original);
});

test('rejects config without OAuth account', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'claude-profile-')), '.claude.json');
  await writeFile(path, '{"theme":"dark"}');

  await assert.rejects(() => readClaudeConfig(path), /oauthAccount/i);
});
