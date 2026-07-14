import {
  requireClaudeIdentity,
  type ClaudeAuthAction,
  type ClaudeAuthStatus,
} from './claude-auth.js';
import type { ClaudeConfigSnapshot, OAuthAccount } from './claude-config.js';
import {
  profileMetadataSchema,
  type CredentialStore,
  type ProfileMetadata,
  type ProfileStatus,
} from './types.js';

type StateValue = { activeProfile?: string; profiles: ProfileMetadata[] };
type StateStore = {
  read(): Promise<StateValue>;
  upsert(profile: ProfileMetadata): Promise<void>;
  setActive(name: string | undefined): Promise<void>;
  remove(name: string): Promise<void>;
};
type Credentials = { read(): Promise<string>; replace(contents: string): Promise<void> };
type ClaudeConfig = {
  read(): Promise<ClaudeConfigSnapshot>;
  replace(account: OAuthAccount): Promise<void>;
  restore(contents: string): Promise<void>;
};
type GetAuthStatus = () => Promise<ClaudeAuthStatus>;
type RunAuth = (action: ClaudeAuthAction) => Promise<void>;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const accountEmail = (account: OAuthAccount) =>
  typeof account.emailAddress === 'string' ? account.emailAddress : undefined;
const accountOrganization = (account: OAuthAccount) =>
  typeof account.organizationUuid === 'string' ? account.organizationUuid : undefined;

const emailFromCredentials = (contents: string) => {
  const value = JSON.parse(contents) as Record<string, unknown>;
  return typeof value.email === 'string' ? value.email : undefined;
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

function assertSameEmail(left?: string, right?: string, message = 'Claude authentication state is inconsistent.') {
  if (left && right && normalizeEmail(left) !== normalizeEmail(right)) throw new Error(message);
}

function accountsMatch(left: OAuthAccount, right: OAuthAccount) {
  const leftEmail = accountEmail(left);
  const rightEmail = accountEmail(right);
  if (leftEmail && rightEmail && normalizeEmail(leftEmail) !== normalizeEmail(rightEmail)) return false;

  const leftOrganization = accountOrganization(left);
  const rightOrganization = accountOrganization(right);
  if (leftOrganization && rightOrganization && leftOrganization !== rightOrganization) return false;

  if ((leftEmail && rightEmail) || (leftOrganization && rightOrganization)) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createProfileService(
  store: CredentialStore,
  state: StateStore,
  credentials: Credentials,
  claudeConfig: ClaudeConfig,
  getAuthStatus: GetAuthStatus,
  runAuth: RunAuth,
) {
  const findCredentialMatch = async (contents: string, profiles: ProfileMetadata[]) => {
    const names = await Promise.all(profiles.map(async (profile) =>
      (await store.get(profile.name)) === contents ? profile.name : undefined));
    const name = names.find((candidate) => candidate !== undefined);
    return profiles.find((profile) => profile.name === name);
  };

  const refreshMatchingCurrent = async (
    contents: string,
    oauthAccount: OAuthAccount,
    currentState?: StateValue,
  ) => {
    const effectiveState = currentState ?? await state.read();
    const credentialMatch = await findCredentialMatch(contents, effectiveState.profiles);
    const activeMatch = effectiveState.profiles.find(
      (profile) => profile.name === effectiveState.activeProfile,
    );
    const current = credentialMatch ?? activeMatch;
    if (!current) return undefined;

    const liveEmail = accountEmail(oauthAccount);
    if (current.email && liveEmail && normalizeEmail(current.email) !== normalizeEmail(liveEmail)) return undefined;
    if (current.oauthAccount && !accountsMatch(current.oauthAccount, oauthAccount)) return undefined;

    const refreshed = profileMetadataSchema.parse({
      ...current,
      ...(liveEmail ? { email: liveEmail } : {}),
      oauthAccount,
    });
    await store.set(current.name, contents);
    await state.upsert(refreshed);
    return refreshed;
  };

  const refreshCurrentWhenPossible = async () => {
    try {
      const [contents, config, currentState] = await Promise.all([
        credentials.read(),
        claudeConfig.read(),
        state.read(),
      ]);
      await refreshMatchingCurrent(contents, config.oauthAccount, currentState);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  };

  const addFromCurrent = async (name?: string) => {
    const [contents, config, authStatus, currentState] = await Promise.all([
      credentials.read(),
      claudeConfig.read(),
      getAuthStatus(),
      state.read(),
    ]);
    JSON.parse(contents);
    const identity = requireClaudeIdentity(authStatus);
    assertSameEmail(
      identity.email,
      accountEmail(config.oauthAccount),
      'Claude authentication state is inconsistent. Log in again before saving this profile.',
    );

    const existing = await findCredentialMatch(contents, currentState.profiles);
    if (existing) {
      assertSameEmail(
        existing.email,
        identity.email ?? accountEmail(config.oauthAccount),
        'Claude authentication state is inconsistent with the profile that owns these credentials.',
      );
      if (existing.oauthAccount && !accountsMatch(existing.oauthAccount, config.oauthAccount)) {
        throw new Error('Claude authentication state is inconsistent with the profile that owns these credentials.');
      }
    }
    const detectedName = name
      ?? existing?.name
      ?? identity.orgName?.trim().replace(/[^a-zA-Z0-9-]+/g, '-');
    if (!detectedName) throw new Error('Could not determine a profile name. Provide one explicitly.');

    const email = identity.email ?? accountEmail(config.oauthAccount) ?? emailFromCredentials(contents);
    const profile = profileMetadataSchema.parse({
      name: detectedName,
      ...(email ? { email } : {}),
      oauthAccount: config.oauthAccount,
    });
    await store.set(profile.name, contents);
    await state.upsert(profile);
    return profile;
  };

  return {
    addFromCurrent,
    async list() { return (await state.read()).profiles; },
    async use(name: string) {
      const originalState = await state.read();
      const target = originalState.profiles.find((profile) => profile.name === name);
      if (!target) throw new Error(`Profile not found: ${name}`);
      if (!target.oauthAccount) {
        throw new Error(
          `Profile “${name}” was saved by an older version. Refresh the profile with `
          + `claude-profile add ${name} or claude-profile login ${name} before switching.`,
        );
      }

      const targetCredentials = await store.get(name);
      if (!targetCredentials) throw new Error(`Stored credentials not found for profile: ${name}`);
      JSON.parse(targetCredentials);

      const [originalCredentials, originalConfig] = await Promise.all([
        credentials.read(),
        claudeConfig.read(),
      ]);
      await refreshMatchingCurrent(originalCredentials, originalConfig.oauthAccount, originalState);

      try {
        await credentials.replace(targetCredentials);
        await claudeConfig.replace(target.oauthAccount);
        const verified = requireClaudeIdentity(await getAuthStatus());
        const expectedEmail = target.email ?? accountEmail(target.oauthAccount);
        assertSameEmail(
          verified.email,
          expectedEmail,
          'Switch verification failed: Claude account does not match the selected profile.',
        );
        await state.setActive(name);
        return target;
      } catch (switchError: unknown) {
        const rollbackErrors: string[] = [];
        try { await credentials.replace(originalCredentials); }
        catch (error: unknown) { rollbackErrors.push(errorMessage(error)); }
        try { await claudeConfig.restore(originalConfig.contents); }
        catch (error: unknown) { rollbackErrors.push(errorMessage(error)); }
        try { await state.setActive(originalState.activeProfile); }
        catch (error: unknown) { rollbackErrors.push(errorMessage(error)); }

        if (rollbackErrors.length > 0) {
          throw new Error(
            `Switch failed: ${errorMessage(switchError)}. Rollback also failed: ${rollbackErrors.join('; ')}`,
          );
        }
        throw new Error(`Switch failed: ${errorMessage(switchError)}. Original authentication was rolled back.`);
      }
    },
    async status(): Promise<ProfileStatus> {
      const authStatus = await getAuthStatus();
      if (!authStatus.loggedIn) return { kind: 'logged-out', profile: 'none', email: 'unavailable' };

      const [contents, config, currentState] = await Promise.all([
        credentials.read(),
        claudeConfig.read(),
        state.read(),
      ]);
      const matched = await findCredentialMatch(contents, currentState.profiles);
      const liveEmail = authStatus.email ?? accountEmail(config.oauthAccount) ?? 'unavailable';
      if (!matched) return { kind: 'unregistered', profile: 'unregistered', email: liveEmail };

      const accountMatches = matched.oauthAccount
        ? accountsMatch(matched.oauthAccount, config.oauthAccount)
        : false;
      const statusMatches = !matched.email
        || !authStatus.email
        || normalizeEmail(matched.email) === normalizeEmail(authStatus.email);
      return {
        kind: accountMatches && statusMatches ? 'matched' : 'mismatch',
        profile: matched.name,
        email: liveEmail,
      };
    },
    async login(name?: string) {
      await refreshCurrentWhenPossible();
      await runAuth('logout');
      await runAuth('login');
      const profile = await addFromCurrent(name);
      await state.setActive(profile.name);
      return profile;
    },
    async remove(name: string) {
      await store.remove(name);
      await state.remove(name);
    },
  };
}
