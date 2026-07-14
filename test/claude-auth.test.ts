import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { spawn } from 'node:child_process';
import test from 'node:test';
import {
  createClaudeAuthRunner,
  parseClaudeAuthStatus,
  requireClaudeIdentity,
} from '../src/claude-auth.js';

test('extracts identity from the signed-in account', () => {
  assert.deepEqual(
    parseClaudeAuthStatus('{"loggedIn":true,"email":"murilo@big2be.com","orgName":"Big2be","subscriptionType":"team"}'),
    { loggedIn: true, email: 'murilo@big2be.com', orgName: 'Big2be', subscriptionType: 'team' },
  );
});

test('preserves logged-out status for status reporting', () => {
  assert.deepEqual(parseClaudeAuthStatus('{"loggedIn":false}'), { loggedIn: false });
});

test('requires a signed-in identity for profile capture', () => {
  assert.throws(() => requireClaudeIdentity({ loggedIn: false }), /not authenticated/i);
  assert.deepEqual(
    requireClaudeIdentity({ loggedIn: true, email: 'dev@company.com' }),
    { email: 'dev@company.com' },
  );
});

test('runs official Claude auth commands in the inherited terminal', async () => {
  const child = new EventEmitter();
  let invocation: unknown[] = [];
  const fakeSpawn = ((...args: unknown[]) => {
    invocation = args;
    queueMicrotask(() => child.emit('exit', 0, null));
    return child;
  }) as unknown as typeof spawn;

  await createClaudeAuthRunner(fakeSpawn)('login');

  assert.deepEqual(invocation, [
    'claude',
    ['auth', 'login'],
    { stdio: 'inherit', windowsHide: false },
  ]);
});

test('rejects failed Claude auth commands', async () => {
  const child = new EventEmitter();
  const fakeSpawn = (() => {
    queueMicrotask(() => child.emit('exit', 1, null));
    return child;
  }) as unknown as typeof spawn;

  await assert.rejects(() => createClaudeAuthRunner(fakeSpawn)('logout'), /code 1/i);
});
