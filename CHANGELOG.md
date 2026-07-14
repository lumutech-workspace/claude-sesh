# Changelog

All notable changes to claude-sesh are documented here.
Format based on Keep a Changelog. Each release notes the Claude Code version it was tested against.

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
