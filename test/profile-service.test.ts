import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClaudeAuthAction, ClaudeAuthStatus } from '../src/claude-auth.js';
import type { OAuthAccount } from '../src/claude-config.js';
import { createProfileService } from '../src/profile-service.js';
import type { ProfileMetadata } from '../src/types.js';

const workCredentials = '{"claudeAiOauth":{"accessToken":"work-secret"}}';
const personalCredentials = '{"claudeAiOauth":{"accessToken":"personal-secret"}}';
const workAccount = {
  emailAddress: 'dev@company.com',
  organizationUuid: 'org-work',
  organizationName: 'Company',
};
const personalAccount = {
  emailAddress: 'dev@example.com',
  organizationUuid: 'org-personal',
  organizationName: 'Personal',
};

type HarnessOptions = {
  profiles?: ProfileMetadata[];
  liveCredentials?: string;
  liveAccount?: OAuthAccount;
  activeProfile?: string;
  status?: () => ClaudeAuthStatus;
  failConfigReplace?: boolean;
  failConfigRestore?: boolean;
  failLogin?: boolean;
  loginCredentials?: string;
  loginAccount?: OAuthAccount;
};

function createHarness(options: HarnessOptions = {}) {
  let profiles = options.profiles ?? [];
  let activeProfile = options.activeProfile;
  let liveCredentials = options.liveCredentials ?? workCredentials;
  let liveAccount = options.liveAccount ?? workAccount;
  let failConfigReplace = options.failConfigReplace ?? false;
  const stored = new Map<string, string>();
  const authActions: ClaudeAuthAction[] = [];

  for (const profile of profiles) {
    if (profile.name === 'work') stored.set(profile.name, workCredentials);
    if (profile.name === 'personal') stored.set(profile.name, personalCredentials);
  }

  const state = {
    read: async () => ({ activeProfile, profiles }),
    upsert: async (profile: ProfileMetadata) => {
      profiles = [...profiles.filter(({ name }) => name !== profile.name), profile];
    },
    setActive: async (name: string | undefined) => { activeProfile = name; },
    remove: async (name: string) => {
      profiles = profiles.filter((profile) => profile.name !== name);
      if (activeProfile === name) activeProfile = undefined;
    },
  };
  const credentials = {
    read: async () => liveCredentials,
    replace: async (contents: string) => { liveCredentials = contents; },
  };
  const claudeConfig = {
    read: async () => ({
      contents: JSON.stringify({ theme: 'dark', oauthAccount: liveAccount }),
      oauthAccount: liveAccount,
    }),
    replace: async (account: OAuthAccount) => {
      if (failConfigReplace) {
        failConfigReplace = false;
        throw new Error('config write failed');
      }
      liveAccount = account;
    },
    restore: async (contents: string) => {
      if (options.failConfigRestore) throw new Error('config restore failed');
      liveAccount = JSON.parse(contents).oauthAccount as OAuthAccount;
    },
  };
  const getAuthStatus = async () => options.status?.() ?? {
    loggedIn: true,
    email: liveAccount.emailAddress,
    orgName: typeof liveAccount.organizationName === 'string' ? liveAccount.organizationName : undefined,
  };
  const runAuth = async (action: ClaudeAuthAction) => {
    authActions.push(action);
    if (action === 'login') {
      if (options.failLogin) throw new Error('login failed');
      liveCredentials = options.loginCredentials ?? personalCredentials;
      liveAccount = options.loginAccount ?? personalAccount;
    }
  };

  return {
    service: createProfileService(
      { get: async (name) => stored.get(name) ?? null, set: async (name, value) => void stored.set(name, value), list: async () => [...stored.keys()], remove: async (name) => stored.delete(name) },
      state,
      credentials,
      claudeConfig,
      getAuthStatus,
      runAuth,
    ),
    stored,
    authActions,
    get profiles() { return profiles; },
    get activeProfile() { return activeProfile; },
    get liveCredentials() { return liveCredentials; },
    get liveAccount() { return liveAccount; },
  };
}

test('captures credentials and OAuth account together', async () => {
  const harness = createHarness();

  const profile = await harness.service.addFromCurrent('work');

  assert.deepEqual(profile, {
    name: 'work',
    email: 'dev@company.com',
    oauthAccount: workAccount,
  });
  assert.equal(harness.stored.get('work'), workCredentials);
});

test('rejects inconsistent status and config identity before storage', async () => {
  const harness = createHarness({
    status: () => ({ loggedIn: true, email: 'other@example.com', orgName: 'Other' }),
  });

  await assert.rejects(() => harness.service.addFromCurrent('work'), /inconsistent/i);

  assert.equal(harness.stored.size, 0);
  assert.equal(harness.profiles.length, 0);
});

test('rejects credentials that belong to a stored profile with another identity', async () => {
  const harness = createHarness({
    profiles: [{ name: 'personal', email: 'dev@example.com', oauthAccount: personalAccount }],
    liveCredentials: personalCredentials,
    liveAccount: workAccount,
  });

  await assert.rejects(() => harness.service.addFromCurrent('work'), /inconsistent/i);

  assert.equal(harness.stored.has('work'), false);
  assert.equal(harness.profiles.length, 1);
});

test('reuses the profile name that matches the current credentials', async () => {
  const harness = createHarness({
    profiles: [{ name: 'BIG2BE' }],
  });
  harness.stored.set('BIG2BE', workCredentials);

  const profile = await harness.service.addFromCurrent();

  assert.equal(profile.name, 'BIG2BE');
  assert.equal(profile.email, 'dev@company.com');
});

test('refuses to partially switch a legacy profile', async () => {
  const harness = createHarness({ profiles: [{ name: 'work', email: 'dev@company.com' }] });

  await assert.rejects(() => harness.service.use('work'), /refresh.*profile|login/i);

  assert.equal(harness.liveCredentials, workCredentials);
});

test('switches both auth documents and refreshes the departing profile', async () => {
  const refreshedWorkCredentials = '{"claudeAiOauth":{"accessToken":"rotated-work-secret"}}';
  const profiles: ProfileMetadata[] = [
    { name: 'work', email: 'dev@company.com', oauthAccount: workAccount },
    { name: 'personal', email: 'dev@example.com', oauthAccount: personalAccount },
  ];
  const harness = createHarness({ profiles, liveCredentials: refreshedWorkCredentials, activeProfile: 'work' });
  harness.stored.set('work', workCredentials);

  await harness.service.use('personal');

  assert.equal(harness.liveCredentials, personalCredentials);
  assert.deepEqual(harness.liveAccount, personalAccount);
  assert.equal(harness.activeProfile, 'personal');
  assert.equal(harness.stored.get('work'), refreshedWorkCredentials);
});

test('rolls back credentials and config when config replacement fails', async () => {
  const harness = createHarness({
    profiles: [
      { name: 'work', email: 'dev@company.com', oauthAccount: workAccount },
      { name: 'personal', email: 'dev@example.com', oauthAccount: personalAccount },
    ],
    activeProfile: 'work',
    failConfigReplace: true,
  });

  await assert.rejects(() => harness.service.use('personal'), /rolled back/i);

  assert.equal(harness.liveCredentials, workCredentials);
  assert.deepEqual(harness.liveAccount, workAccount);
  assert.equal(harness.activeProfile, 'work');
});

test('rolls back when Claude verifies a different account', async () => {
  const harness = createHarness({
    profiles: [
      { name: 'work', email: 'dev@company.com', oauthAccount: workAccount },
      { name: 'personal', email: 'dev@example.com', oauthAccount: personalAccount },
    ],
    activeProfile: 'work',
    status: () => ({ loggedIn: true, email: 'wrong@example.com' }),
  });

  await assert.rejects(() => harness.service.use('personal'), /verification|match/i);

  assert.equal(harness.liveCredentials, workCredentials);
  assert.deepEqual(harness.liveAccount, workAccount);
  assert.equal(harness.activeProfile, 'work');
});

test('reports rollback failures together with the switch failure', async () => {
  const harness = createHarness({
    profiles: [
      { name: 'work', email: 'dev@company.com', oauthAccount: workAccount },
      { name: 'personal', email: 'dev@example.com', oauthAccount: personalAccount },
    ],
    activeProfile: 'work',
    failConfigReplace: true,
    failConfigRestore: true,
  });

  await assert.rejects(() => harness.service.use('personal'), /config write failed.*config restore failed/is);
});

test('classifies matched, mismatched, and unregistered live profiles', async () => {
  const profiles: ProfileMetadata[] = [
    { name: 'work', email: 'dev@company.com', oauthAccount: workAccount },
    { name: 'personal', email: 'dev@example.com', oauthAccount: personalAccount },
  ];
  const matched = createHarness({ profiles });
  assert.deepEqual(await matched.service.status(), {
    kind: 'matched', profile: 'work', email: 'dev@company.com',
  });

  const mismatched = createHarness({ profiles, liveAccount: personalAccount });
  assert.deepEqual(await mismatched.service.status(), {
    kind: 'mismatch', profile: 'work', email: 'dev@example.com',
  });

  const unregistered = createHarness({ profiles, liveCredentials: '{"unknown":true}' });
  assert.deepEqual(await unregistered.service.status(), {
    kind: 'unregistered', profile: 'unregistered', email: 'dev@company.com',
  });
});

test('classifies a logged-out Claude session', async () => {
  const harness = createHarness({ status: () => ({ loggedIn: false }) });

  assert.deepEqual(await harness.service.status(), {
    kind: 'logged-out', profile: 'none', email: 'unavailable',
  });
});

test('logs in with Claude, captures the new profile, and keeps it active', async () => {
  const harness = createHarness({
    profiles: [{ name: 'work', email: 'dev@company.com', oauthAccount: workAccount }],
    activeProfile: 'work',
  });

  const profile = await harness.service.login('personal');

  assert.deepEqual(harness.authActions, ['logout', 'login']);
  assert.equal(profile.email, 'dev@example.com');
  assert.deepEqual(profile.oauthAccount, personalAccount);
  assert.equal(harness.stored.get('personal'), personalCredentials);
  assert.equal(harness.activeProfile, 'personal');
});

test('does not create a profile when Claude login fails', async () => {
  const harness = createHarness({
    profiles: [{ name: 'work', email: 'dev@company.com', oauthAccount: workAccount }],
    activeProfile: 'work',
    failLogin: true,
  });

  await assert.rejects(() => harness.service.login('personal'), /login failed/i);

  assert.deepEqual(harness.authActions, ['logout', 'login']);
  assert.equal(harness.stored.has('personal'), false);
  assert.equal(harness.activeProfile, 'work');
});
