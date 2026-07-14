import { deletePassword, getPassword, setPassword } from 'cross-keychain';
import type { CredentialStore } from './types.js';

const service = 'claude-profile';
export const createCredentialStore = (): CredentialStore => ({
  get: (name) => getPassword(service, name),
  set: (name, value) => setPassword(service, name, value),
  list: async () => [],
  remove: async (name) => { await deletePassword(service, name); return true; },
});
