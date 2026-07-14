import assert from 'node:assert/strict';
import test from 'node:test';

import { profileMetadataSchema } from '../src/types.js';

test('accepts metadata without token fields', () => {
  assert.deepEqual(
    profileMetadataSchema.parse({ name: 'work', email: 'ana@company.com' }),
    { name: 'work', email: 'ana@company.com' },
  );

  assert.throws(() =>
    profileMetadataSchema.parse({ name: 'work', accessToken: 'secret' }),
  );
});

test('accepts uppercase profile names', () => {
  assert.deepEqual(profileMetadataSchema.parse({ name: 'BIG2BE' }), { name: 'BIG2BE' });
});

test('accepts a complete profile snapshot', () => {
  const profile = profileMetadataSchema.parse({
    name: 'work',
    email: 'dev@company.com',
    oauthAccount: {
      emailAddress: 'dev@company.com',
      organizationUuid: 'org-1',
      organizationName: 'Company',
    },
  });

  assert.equal(profile.oauthAccount?.organizationUuid, 'org-1');
});

test('rejects OAuth tokens inside profile metadata', () => {
  assert.throws(() => profileMetadataSchema.parse({
    name: 'work',
    oauthAccount: {
      emailAddress: 'dev@company.com',
      accessToken: 'secret',
    },
  }), /token/i);
});
