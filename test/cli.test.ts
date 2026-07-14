import assert from 'node:assert/strict';
import test from 'node:test';
import { formatList, formatStatus, interactiveActions } from '../src/presentation.js';

test('status displays email without exposing token fields', () => {
  const output = formatStatus({ kind: 'matched', profile: 'work', email: 'ana@company.com' });
  assert.match(output, /ana@company\.com/);
  assert.doesNotMatch(output, /accessToken|refreshToken/);
});

test('mismatch status explains that Claude reports another account', () => {
  const output = formatStatus({ kind: 'mismatch', profile: 'work', email: 'other@example.com' });
  assert.match(output, /does not match/i);
  assert.match(output, /other@example\.com/);
});

test('status distinguishes unregistered and logged-out accounts', () => {
  assert.match(
    formatStatus({ kind: 'unregistered', profile: 'unregistered', email: 'new@example.com' }),
    /not registered/i,
  );
  assert.match(
    formatStatus({ kind: 'logged-out', profile: 'none', email: 'unavailable' }),
    /not authenticated/i,
  );
});

test('empty list explains that no profiles are registered', () => {
  assert.equal(formatList([]), 'No profiles registered.');
});

test('list numbers each profile', () => {
  const output = formatList([{ name: 'work', email: 'a@b.com' }, { name: 'personal', email: 'c@d.com' }]);
  assert.match(output, /1\. work/);
  assert.match(output, /2\. personal/);
});

test('list marks the active profile and leaves others unmarked', () => {
  const output = formatList(
    [{ name: 'work', email: 'a@b.com' }, { name: 'personal', email: 'c@d.com' }],
    'personal',
  );
  const lines = output.split('\n');
  assert.match(lines.find((line) => line.includes('personal')) ?? '', /→.*\(active\)/);
  assert.doesNotMatch(lines.find((line) => line.includes('work')) ?? '', /→|\(active\)/);
});

test('interactive menu orders frequent actions before rare setup actions', () => {
  assert.deepEqual(
    interactiveActions.map((action) => action.value),
    ['use', 'list', 'status', 'remove', 'add', 'login', 'update', 'clear', 'exit'],
  );
});
