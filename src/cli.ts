#!/usr/bin/env node
import { confirm, isCancel, select } from '@clack/prompts';
import { Command } from 'commander';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readClaudeAuthStatus, runClaudeAuth } from './claude-auth.js';
import { readInstalledClaudeVersion } from './claude-version.js';
import { classifyCompatibility, compareVersions } from './version-compare.js';
import { APP_VERSION, COMPATIBLE_CLAUDE_VERSION } from './version-info.js';
import { renderHomeScreen } from './home-screen.js';
import { createUpdateApplier, fetchLatestRelease } from './updater.js';
import { download, extract, sync, install, resolvePackageDir, resolveTmpDir } from './update-io.js';
import {
  defaultClaudeConfigPath,
  readClaudeConfig,
  replaceOAuthAccount,
  restoreClaudeConfig,
  type OAuthAccount,
} from './claude-config.js';
import { defaultCredentialsPath, readCredentials, replaceCredentials } from './claude-credentials.js';
import { createCredentialStore } from './credential-store.js';
import { buildProfileOptions, keepMenuOpenOnError } from './interactive.js';
import {
  formatList,
  formatStatus,
  formatSuccess,
  interactiveActions,
  restartWarning,
} from './presentation.js';
import { createProfileService } from './profile-service.js';
import { createStateStore } from './state-store.js';

const state = createStateStore(join(process.env.APPDATA ?? homedir(), 'claude-sesh'));
const credentials = {
  read: () => readCredentials(),
  replace: (contents: string) => replaceCredentials(defaultCredentialsPath(), contents),
};
const claudeConfigPath = defaultClaudeConfigPath();
const claudeConfig = {
  read: () => readClaudeConfig(claudeConfigPath),
  replace: (account: OAuthAccount) => replaceOAuthAccount(claudeConfigPath, account),
  restore: (contents: string) => restoreClaudeConfig(claudeConfigPath, contents),
};
const service = createProfileService(
  createCredentialStore(),
  state,
  credentials,
  claudeConfig,
  readClaudeAuthStatus,
  runClaudeAuth,
);

const program = new Command()
  .name('claude-sesh')
  .description('Manage local Claude Code profiles on Windows');

program.command('add [name]').action(async (name) => {
  const profile = await service.addFromCurrent(name);
  console.log(formatSuccess(`Profile "${profile.name}" saved.\n  Email: ${profile.email ?? 'unavailable'}`));
});
program.command('login [name]').action(async (name) => {
  if (!(await confirmBrowserLogin())) return;
  const profile = await service.login(name);
  console.log(formatSuccess(`Profile "${profile.name}" authenticated and saved.\n  Email: ${profile.email ?? 'unavailable'}`));
  console.log(restartWarning);
});
program.command('list').action(async () => {
  const { profiles, activeProfile } = await service.list();
  console.log(formatList(profiles, activeProfile));
});
program.command('use <name>').action(async (name) => {
  const profile = await service.use(name);
  console.log(formatSuccess(`Active profile changed to "${name}".\n  Email: ${profile.email ?? 'unavailable'}`));
  console.log(restartWarning);
});
program.command('remove <name>').option('--yes', 'confirm removal').action(async (name, options) => {
  if (!options.yes) throw new Error('Removal requires confirmation. Run: claude-sesh remove <name> --yes');
  await service.remove(name);
  console.log(formatSuccess(`Profile "${name}" removed.`));
});
program.command('update').action(async () => {
  await runUpdateFlow();
});
program.option('--status', 'show the active profile').action(async (options) => {
  if (options.status) console.log(formatStatus(await service.status()));
});

async function confirmBrowserLogin(): Promise<boolean> {
  console.log('\nThis will open your browser automatically to sign in to Claude Code.');
  const proceed = await confirm({ message: 'Continue?' });
  if (isCancel(proceed) || !proceed) {
    console.log('Login canceled.\n');
    return false;
  }
  return true;
}

async function printHomeScreen() {
  const detected = await readInstalledClaudeVersion();
  let profileName: string | undefined;
  try {
    const status = await service.status();
    if (status.kind === 'matched') profileName = status.profile;
  } catch { /* status indisponível não deve impedir a tela */ }
  // updateAvailable é omitido de propósito: checar update aqui bloquearia a abertura
  // com uma chamada de rede. O update é sob demanda via "Check for updates".
  console.log(renderHomeScreen({
    appVersion: APP_VERSION,
    compatibleClaude: COMPATIBLE_CLAUDE_VERSION,
    detectedClaude: detected,
    compatibility: classifyCompatibility(COMPATIBLE_CLAUDE_VERSION, detected),
    profileName,
  }));
  console.log('');
}

async function runUpdateFlow() {
  // Busca direta com fetchLatestRelease (que lança em falha) para distinguir
  // "falha de rede" de "já atualizado" — createUpdateChecker converte ambos em null.
  let update: { latest: string; url: string; tarball: string } | null;
  try {
    const release = await fetchLatestRelease();
    const latest = release.tag_name.replace(/^v/, '');
    update = compareVersions(latest, APP_VERSION) > 0
      ? { latest, url: release.html_url, tarball: release.tarball_url }
      : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`\nCould not check for updates (offline?): ${message}\n`);
    return;
  }
  if (!update) {
    console.log(`\nYou are on the latest version (v${APP_VERSION}).\n`);
    return;
  }
  console.log(`\nUpdate available: v${APP_VERSION} → v${update.latest}\n${update.url}\n`);
  const proceed = await confirm({ message: `Download and install v${update.latest} now?` });
  if (isCancel(proceed) || !proceed) {
    console.log('Update canceled.\n');
    return;
  }
  const apply = createUpdateApplier({
    download,
    extract,
    sync,
    install,
    packageDir: resolvePackageDir(),
    tmpDir: resolveTmpDir(),
  });
  try {
    console.log(`\nDownloading and installing v${update.latest}...`);
    await apply(update);
    console.log(`\n[OK] Updated to v${update.latest}. Restart claude-sesh to use the new version.\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`\n${message}\n`);
    console.log(`You can update manually from: ${update.url}\n`);
  }
}

async function runInteractive() {
  await printHomeScreen();
  let exitRequested = false;
  while (!exitRequested) {
    await keepMenuOpenOnError(async () => {
      const action = await select({ message: 'What would you like to do?', options: interactiveActions });
      if (isCancel(action) || action === 'exit') {
        exitRequested = true;
        return;
      }
      if (action === 'list') {
        const { profiles, activeProfile } = await service.list();
        console.log(`\n${formatList(profiles, activeProfile)}\n`);
      }
      if (action === 'status') console.log(`\n${formatStatus(await service.status())}\n`);
      if (action === 'add') {
        const profile = await service.addFromCurrent();
        console.log(`\n${formatSuccess(`Profile "${profile.name}" saved.\n  Email: ${profile.email ?? 'unavailable'}`)}\n`);
      }
      if (action === 'login') {
        if (!(await confirmBrowserLogin())) return;
        const profile = await service.login();
        console.log(`\n${formatSuccess(`Profile "${profile.name}" authenticated and saved.\n  Email: ${profile.email ?? 'unavailable'}`)}\n${restartWarning}\n`);
      }
      if (action === 'update') {
        await runUpdateFlow();
      }
      if (action === 'clear') {
        console.clear();
        await printHomeScreen();
      }
      if (action === 'use' || action === 'remove') {
        const { profiles, activeProfile } = await service.list();
        if (profiles.length === 0) {
          console.log(`\n${formatList(profiles, activeProfile)}\n`);
          return;
        }
        const name = await select({
          message: action === 'use' ? 'Select a profile to activate:' : 'Select a profile to remove:',
          options: buildProfileOptions(profiles),
        });
        if (isCancel(name)) return;
        if (action === 'use') {
          const profile = await service.use(name);
          console.log(`\n${formatSuccess(`Active profile changed to "${name}".\n  Email: ${profile.email ?? 'unavailable'}`)}\n${restartWarning}\n`);
        }
        if (action === 'remove') {
          const confirmation = await select({
            message: `Remove "${name}"?`,
            options: [
              { value: 'yes', label: 'y. Yes, remove' },
              { value: 'no', label: 'n. No, go back' },
              { value: 'cancel', label: 'cancel. Cancel operation' },
            ],
          });
          if (confirmation === 'yes') {
            await service.remove(name);
            console.log(`\n${formatSuccess(`Profile "${name}" removed.`)}\n`);
          }
        }
      }
    }, (message) => console.error(`\nError: ${message}\n`));
  }
}

const run = process.argv.length === 2 ? runInteractive() : program.parseAsync();
run.catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
