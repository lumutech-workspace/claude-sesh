# claude-sesh

**Switch between multiple Claude Code accounts without logging in through the browser every time.**

Claude Code only remembers one authenticated account at a time. If you juggle a
work account and a personal one, switching normally means logging out and going
through browser login again. `claude-sesh` snapshots each account's credentials
locally so you can jump between them with a single command.

> Windows only, for now. Credentials are stored via Windows Credential Manager.

## Requirements

- Windows
- Node.js 20 or newer
- Claude Code installed and authenticated at least once

## Install

`claude-sesh` is published to **GitHub Packages** (the public npm registry has
no copy). Pick the flow that fits you — both end with a global `claude-sesh`
command on your `PATH`.

### Option A — From GitHub Packages (recommended for users)

GitHub Packages requires authenticating to its npm registry once, even for
public packages. Create a [personal access token (classic)](https://github.com/settings/tokens)
with the `read:packages` scope, then tell npm to use it for the org scope:

```powershell
# One-time setup — writes ~/.npmrc
npm config set @lumutech-workspace:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

# Install the CLI globally
npm install -g @lumutech-workspace/claude-sesh
```

The command stays `claude-sesh` regardless of the scoped package name.

### Option B — From the Git repository (for development)

```powershell
git clone https://github.com/lumutech-workspace/claude-sesh.git
cd claude-sesh
npm install
npm run build
npm link
```

Use `npm run start` to run from source without linking.

To remove the global command later, run `npm uninstall -g @lumutech-workspace/claude-sesh`
(or `npm unlink -g claude-sesh` if you installed with Option B).

## Quickstart

```powershell
# Save the account you're currently signed in to
claude-sesh add work

# Log in to another account (opens the browser) and save it as "personal"
claude-sesh login personal

# Switch back to work whenever you want
claude-sesh use work
```

Run `claude-sesh` with no arguments to open the interactive menu instead.

## Commands

| Command | What it does |
| --- | --- |
| `claude-sesh` | Open the interactive menu |
| `claude-sesh add [name]` | Save the currently authenticated account as a profile |
| `claude-sesh login [name]` | Log in to a new account in the browser and save it |
| `claude-sesh list` | List every saved profile (active one is marked) |
| `claude-sesh use <name>` | Switch the active account to `<name>` |
| `claude-sesh --status` | Show the current authentication state |
| `claude-sesh remove <name> --yes` | Delete a saved profile |
| `claude-sesh update` | Check for and install a new version |

When `[name]` is omitted, the CLI names the profile after the organization
Claude Code reports. Registering a name that already exists updates it instead
of creating a duplicate.

## How switching works

Each profile is a snapshot of two things:

- the OAuth credentials from `~/.claude/.credentials.json`
- the `oauthAccount` identity from `~/.claude.json`

`use` writes both back, then verifies the result against Claude Code before
marking the profile active. The account you're leaving is refreshed first, so
any token rotation Claude Code performed is preserved. If a write or the
verification fails, the CLI restores both original documents.

If a saved profile points to a credential that no longer exists in Windows
Credential Manager, `claude-sesh` drops the stale entry and offers to log in or
re-add the account on the spot.

## Status states

`claude-sesh --status` distinguishes between:

- a verified, registered profile;
- credentials and account identity that don't match;
- an authenticated account that isn't registered;
- a logged-out Claude Code session.

## Updates

The home screen footer shows the claude-sesh version, the Claude Code version it
was tested against, and the Claude Code version currently installed — with a
warning when the installed Claude is newer than the tested one.

Updates never run on startup (no network call on launch). Check on demand with
`claude-sesh update` or the **Check for updates** menu option. The command
queries the latest GitHub Release and, after you confirm, downloads its source
tarball, copies it over the current install, and runs `npm install` +
`npm run build`. Restart `claude-sesh` afterwards.

<details>
<summary><strong>Publishing a release (maintainers)</strong></summary>

1. Bump `version` in `package.json`.
2. Update `COMPATIBLE_CLAUDE_VERSION` in `src/version-info.ts` to the Claude
   Code version you validated against.
3. Add a `## [vX.Y.Z] - DATE` entry to `CHANGELOG.md`, including the
   `Compatible with Claude Code:` line.
4. Commit and push.
5. Create a GitHub Release with tag `vX.Y.Z` (it **must** match
   `package.json` — the workflow fails otherwise).

Publishing the release triggers [`.github/workflows/publish.yml`](.github/workflows/publish.yml),
which builds and publishes `@lumutech-workspace/claude-sesh` to GitHub Packages
using the CI-provided `GITHUB_TOKEN` — no local token or manual `npm publish`
needed.

Two independent upgrade paths exist for users: `npm install -g` picks up the new
GitHub Packages version, and the built-in `claude-sesh update` downloads the
release source tarball directly. Both only offer versions newer than what's
installed.

</details>

## Security

OAuth credentials are stored through Windows Credential Manager. Profile names,
emails, and `oauthAccount` metadata live separately under the current user's
application data directory. OAuth tokens are never printed or stored in profile
metadata.

`claude-sesh` orchestrates Claude Code's official authentication commands and
reuses local Claude Code OAuth credentials. It does not handle passwords,
browser cookies, or authorization codes. Verify that this workflow complies with
Anthropic's applicable terms before using or distributing it.

---

Made by [Lumu](https://lumutech.com.br) · [github.com/lumutech-workspace](https://github.com/lumutech-workspace)
