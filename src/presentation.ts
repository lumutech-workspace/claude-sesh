import type { ProfileStatus } from './types.js';

export const formatStatus = (status: ProfileStatus) => {
  if (status.kind === 'logged-out') {
    return 'Claude Code is not authenticated.\n  Run: claude-profile login [name]';
  }
  if (status.kind === 'unregistered') {
    return `Authenticated account is not registered.\n  Email: ${status.email}\n  Run: claude-profile add [name]`;
  }
  if (status.kind === 'mismatch') {
    return `Authentication mismatch\n  Stored profile: ${status.profile}\n  Claude reports: ${status.email}\n  The live account does not match this profile.`;
  }
  return `Active profile\n  Name: ${status.profile}\n  Email: ${status.email}\n  State: verified`;
};

export const formatList = (profiles: Array<{ name: string; email?: string }>) =>
  profiles.length === 0
    ? 'No profiles registered.'
    : `Registered profiles\n${profiles
        .map((profile) => `  - ${profile.name}\n    ${profile.email ?? 'email unavailable'}`)
        .join('\n')}`;

export const formatSuccess = (message: string) => `[OK] ${message}`;

export const restartWarning =
  'Restart open Claude Code or VS Code sessions so they do not retain or overwrite the previous account.';

export const interactiveActions = [
  { value: 'add', label: '1. Add current profile' },
  { value: 'login', label: '2. Log in and register an account' },
  { value: 'list', label: '3. View profiles' },
  { value: 'status', label: '4. View active profile' },
  { value: 'use', label: '5. Switch profile' },
  { value: 'remove', label: '6. Remove profile' },
  { value: 'update', label: '7. Check for updates' },
  { value: 'exit', label: '0. Exit' },
];
