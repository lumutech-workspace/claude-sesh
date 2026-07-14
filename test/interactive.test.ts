import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfileOptions, keepMenuOpenOnError } from '../src/interactive.js';

test('builds selectable options from registered profiles', () => {
  assert.deepEqual(
    buildProfileOptions([
      { name: 'work', email: 'dev@company.com' },
      { name: 'personal' },
    ]),
    [
      { value: 'work', label: 'work', hint: 'dev@company.com' },
      { value: 'personal', label: 'personal', hint: 'email unavailable' },
    ],
  );
});

test('reports an action error without rejecting the menu loop', async () => {
  let reported = '';

  await keepMenuOpenOnError(
    async () => { throw new Error('Profile not found'); },
    (message) => { reported = message; },
  );

  assert.equal(reported, 'Profile not found');
});
