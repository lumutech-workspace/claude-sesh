import type { ProfileStatus } from './types.js';

export const formatStatus = (status: ProfileStatus) => {
  if (status.kind === 'logged-out') {
    return 'Claude Code is not authenticated.\n  Run: claude-sesh login [name]';
  }
  if (status.kind === 'unregistered') {
    return `Authenticated account is not registered.\n  Email: ${status.email}\n  Run: claude-sesh add [name]`;
  }
  if (status.kind === 'mismatch') {
    return `Authentication mismatch\n  Stored profile: ${status.profile}\n  Claude reports: ${status.email}\n  The live account does not match this profile.`;
  }
  return `Active profile\n  Name: ${status.profile}\n  Email: ${status.email}\n  State: verified`;
};

export const formatList = (
  profiles: Array<{ name: string; email?: string }>,
  activeProfile?: string,
) =>
  profiles.length === 0
    ? 'No profiles registered.'
    : `Registered profiles\n${profiles
        .map((profile, index) => {
          const marker = profile.name === activeProfile ? '→' : ' ';
          return `  ${marker} ${index + 1}. ${profile.name}${profile.name === activeProfile ? ' (active)' : ''}\n       ${profile.email ?? 'email unavailable'}`;
        })
        .join('\n')}`;

export const formatSuccess = (message: string) => `[OK] ${message}`;

export const restartWarning =
  'Restart open Claude Code or VS Code sessions so they do not retain or overwrite the previous account.';

export const interactiveActions = [
  { value: 'use', label: 'Switch profile' },
  { value: 'list', label: 'View profiles' },
  { value: 'status', label: 'View active profile' },
  { value: 'remove', label: 'Remove profile' },
  { value: 'add', label: 'Add current profile' },
  { value: 'login', label: 'Log in and register an account' },
  { value: 'update', label: 'Check for updates' },
  { value: 'clear', label: 'Clear screen' },
  { value: 'exit', label: 'Exit' },
];
