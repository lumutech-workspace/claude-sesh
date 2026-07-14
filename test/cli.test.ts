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

test('interactive menu exposes all available actions', () => {
  assert.deepEqual(interactiveActions.map((action) => action.value), ['add', 'login', 'list', 'status', 'use', 'remove', 'update', 'exit']);
});
