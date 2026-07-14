import type { ProfileMetadata } from './types.js';

export function buildProfileOptions(profiles: ProfileMetadata[]) {
  return profiles.map((profile) => ({
    value: profile.name,
    label: profile.name,
    hint: profile.email ?? 'email unavailable',
  }));
}

export async function keepMenuOpenOnError(
  task: () => Promise<void>,
  reportError: (message: string) => void,
) {
  try {
    await task();
  } catch (error: unknown) {
    reportError(error instanceof Error ? error.message : String(error));
  }
}
