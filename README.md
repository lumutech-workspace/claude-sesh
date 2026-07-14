# claude-sesh

A Windows CLI for storing and switching between authenticated Claude Code profiles without repeating browser login for every switch.

## Requirements

- Windows
- Node.js 20 or newer
- Claude Code installed

## Installation

```powershell
npm install
npm run build
npm link
```

## Usage

Run the interactive menu:

```powershell
claude-sesh
```

Or use commands directly:

```powershell
claude-sesh login work
claude-sesh add work
claude-sesh list
claude-sesh use work
claude-sesh --status
claude-sesh remove work --yes
```

## Register accounts

The easiest way to register another account is:

```powershell
claude-sesh login personal
```

The command saves the current registered profile when possible, runs Claude Code's official logout and login commands, waits for browser authentication, and registers the newly authenticated account. The new account remains active.

Use `add` when Claude Code is already authenticated with the account you want to save:

```powershell
claude-sesh add work
```

When no name is provided, the CLI uses the organization reported by Claude Code. Existing matching profiles are updated instead of duplicated.

## Switch accounts

```powershell
claude-sesh use work
claude auth status --json
```

A profile snapshot contains both the OAuth credentials from `~/.claude/.credentials.json` and the `oauthAccount` identity from `~/.claude.json`. Switching updates both sources and verifies the result with Claude Code before marking the profile active.

The profile being left is refreshed before switching so token rotation performed by Claude Code is preserved. If any write or verification fails, the CLI attempts to restore both original authentication documents.

Restart open Claude Code or VS Code sessions after switching. A running session may retain or overwrite authentication state from the previous account.

## Upgrading existing profiles

Profiles created before complete authentication snapshots were introduced do not contain `oauthAccount`. Refresh each account once before switching it:

```powershell
claude-sesh login work
claude-sesh login personal
```

You can also authenticate manually and run `claude-sesh add <name>` while the credentials and account identity are consistent.

## Updates

The home screen footer shows the claude-sesh version, the Claude Code version it was
tested against, and the Claude Code version currently installed. A yellow warning appears
when the installed Claude is newer than the tested one.

Check for and install updates on demand:

```powershell
claude-sesh update
```

Or choose "Check for updates" from the interactive menu. The command queries the latest
GitHub Release, and — after you confirm — downloads its source tarball, copies it over the
current install, and runs `npm install` + `npm run build`. Restart claude-sesh
afterwards. Updates never run automatically on launch (no network call on startup).

### Publishing a release (maintainers)

Updates are served from GitHub Releases of `lumutech-workspace/claude-sesh`. To publish one:

1. Bump `version` in `package.json`.
2. Update `COMPATIBLE_CLAUDE_VERSION` in `src/version-info.ts` to the Claude Code version
   you validated against.
3. Add an entry to `CHANGELOG.md` (`## [vX.Y.Z] - DATE`, with the `Compatible with Claude
   Code:` line).
4. Commit and push to the repository.
5. Create a GitHub Release with tag `vX.Y.Z` (matching `package.json`). The source tarball
   GitHub attaches automatically is what the updater downloads — no manual asset needed.

The updater compares the release tag against the installed version and only offers to
update when the release is newer.

## Status states

`claude-sesh --status` distinguishes between:

- a verified registered profile;
- credentials and account identity that do not match;
- an authenticated account that is not registered;
- a logged-out Claude Code session.

## Security and compatibility

OAuth credentials are stored through Windows Credential Manager. Profile names, email addresses, and `oauthAccount` identity metadata are stored separately under the current user's application data directory. OAuth tokens are never printed or stored in profile metadata.

This project orchestrates Claude Code's official authentication commands and reuses local Claude Code OAuth credentials. It does not handle passwords, browser cookies, or authorization codes. Verify that this workflow complies with Anthropic's applicable terms before using or distributing it.
