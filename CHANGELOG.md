# Changelog

All notable changes to claude-sesh are documented here.
Format based on Keep a Changelog. Each release notes the Claude Code version it was tested against.

## [v1.0.0] - 2026-07-14

First stable release. Everything works end to end: register accounts, switch
profiles, and pick the active one back up without logging in again.

Compatible with Claude Code: v2.1.81

### 🩹 Fixed
- Switching to a profile whose OS credential no longer exists used to throw an
  unrecoverable error. The ghost profile is now removed and you can log in or
  re-add the account on the spot.

### 💄 Improved
- The home screen greets you by `@name` and shows the active account's email
  (instead of the profile name), plus a Lumu attribution line.

## [v0.2.0] - 2026-07-14

Compatible with Claude Code: v2.1.81

### 🚚 Changed
- Renamed the package and CLI command from `claude-profile` to `claude-sesh`
  (matches the GitHub repository name).

### 🚸 Improved
- Simplified the home screen: dropped the pixel-art logo, now shows the
  active profile name, and the panel width adapts to the real terminal size
  so the border never misaligns on narrow windows (overflowing text is
  truncated with an ellipsis instead).
- Reordered the interactive menu so frequent actions (switch, list, status,
  remove) come before rare setup actions (add, login); added a "Clear
  screen" option.
- Confirm before "login" opens a browser automatically.

### 🐛 Fixed
- Profile removal no longer gets stuck when the OS credential was already
  missing — it used to abort before the profile was cleared from state.json,
  leaving it stuck in the list forever.

## [v0.1.0] - 2026-07-13

Compatible with Claude Code: v2.1.81

### ✨ New
- Home screen with Lumu branding, pixel-art logo, and usage tips.
- Version footer: shows claude-sesh version, compatible Claude version, and the detected installed Claude version.
- Incompatibility warning when the installed Claude is newer than the tested version.
- "Check for updates" menu option and `claude-sesh update` command (GitHub Releases).
