import pc from 'picocolors';
import { boxTop, boxBottom, boxDivider, boxRow } from './box.js';
import { renderLogo, LOGO_WIDTH } from './logo.js';
import type { Compatibility } from './version-compare.js';

export type HomeScreenInput = {
  appVersion: string;
  compatibleClaude: string;
  detectedClaude: string | null;
  compatibility: Compatibility;
  profileName?: string;
  updateAvailable?: string;
};

const WIDTH = 78; // colunas totais do painel

const TIPS: [string, string][] = [
  ['login', 'to add another account.'],
  ['list', 'to see every registered profile.'],
  ['use <name>', 'switches the active account.'],
];

export function renderHomeScreen(input: HomeScreenInput): string {
  const logo = renderLogo();
  const gap = '  ';

  const welcome = input.profileName
    ? `Welcome back, ${input.profileName}!`
    : 'Welcome!';
  const textLines: string[] = [
    pc.bold(pc.white(welcome)),
    '',
    pc.dim('Multi-account auth for Claude Code.'),
    pc.dim('Switch profiles without logging in again.'),
    '',
    pc.dim('───────── Tips ─────────'),
    ...TIPS.map(([cmd, rest]) => `${pc.dim('›')} ${pc.white(cmd)} ${pc.dim(rest)}`),
  ];

  const lines: string[] = [];
  lines.push(boxTop(`${pc.bold('claude-profile')} v${input.appVersion}`, WIDTH));
  lines.push(boxRow('', WIDTH));

  const rows = Math.max(logo.length, textLines.length);
  for (let i = 0; i < rows; i++) {
    const logoPart = logo[i] ?? ' '.repeat(LOGO_WIDTH);
    const textPart = textLines[i] ?? '';
    lines.push(boxRow(`${logoPart}${gap}${textPart}`, WIDTH));
  }

  lines.push(boxRow('', WIDTH));
  lines.push(boxRow(`${pc.dim('by')} ${pc.bold('Lumu')} ${pc.dim('· lumutech.com.br')}`, WIDTH));
  lines.push(boxRow('', WIDTH));
  lines.push(boxDivider(WIDTH));

  const detectedLabel = input.detectedClaude
    ? (input.compatibility === 'newer' ? pc.yellow(`v${input.detectedClaude}`) : pc.green(`v${input.detectedClaude}`))
    : pc.dim('not found');
  // Rodapé em duas linhas para nunca truncar (nem quando "detected" é "not found").
  lines.push(boxRow(pc.white(`claude-profile v${input.appVersion}`), WIDTH));
  lines.push(boxRow(
    `Compatible with Claude ${pc.green(`v${input.compatibleClaude}`)} ${pc.dim('·')} detected ${detectedLabel}`,
    WIDTH,
  ));

  if (input.compatibility === 'newer' && input.detectedClaude) {
    lines.push(boxRow(
      pc.yellow(`⚠ Your Claude (v${input.detectedClaude}) is newer than tested (v${input.compatibleClaude}) — may be unstable.`),
      WIDTH,
    ));
  }
  if (input.updateAvailable) {
    lines.push(boxRow(
      pc.dim(`Update available: v${input.updateAvailable} (choose "Check for updates")`),
      WIDTH,
    ));
  }

  lines.push(boxBottom(WIDTH));
  return lines.join('\n');
}
