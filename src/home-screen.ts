import pc from 'picocolors';
import { boxTop, boxBottom, boxDivider, boxRow } from './box.js';
import type { Compatibility } from './version-compare.js';

export type HomeScreenInput = {
  appVersion: string;
  compatibleClaude: string;
  detectedClaude: string | null;
  compatibility: Compatibility;
  profileName?: string;
  profileEmail?: string;
  updateAvailable?: string;
};

const MAX_WIDTH = 78; // colunas totais do painel (acomoda o aviso de incompatibilidade)
// Piso puramente estrutural: abaixo disso não há espaço nem para os cantos/margens
// da moldura. Não é um "limite de conforto" — é o mínimo matemático de box.ts.
const MIN_WIDTH = 20;

const TIPS: [string, string][] = [
  ['login', 'to add another account.'],
  ['list', 'to see every registered profile.'],
  ['use <name>', 'switches the active account.'],
];

type ContentLine = string; // linha de conteúdo sem moldura, pode conter ANSI

function buildContentLines(input: HomeScreenInput): {
  title: string;
  body: ContentLine[];
  footer: ContentLine[];
} {
  const welcome = input.profileName
    ? `Welcome back, @${input.profileName}!`
    : 'Welcome!';
  const activeLine = input.profileEmail
    ? pc.dim(`Active profile: ${pc.white(input.profileEmail)}`)
    : pc.dim('No active profile yet.');


  const body: ContentLine[] = [
    pc.bold(pc.white(welcome)),
    activeLine,
    '',
    pc.dim('Multi-account auth for Claude Code.'),
    pc.dim('Switch profiles without logging in again.'),
    '',
    pc.dim('───── Tips ─────'),
    ...TIPS.map(([cmd, rest]) => `${pc.dim('›')} ${pc.white(cmd)} ${pc.dim(rest)}`),
    '',
    `${pc.dim('by')} ${pc.bold('Lumu')} ${pc.dim('· lumutech.com.br')} ${pc.dim('· github.com/lumutech-workspace')}`,
  ];

  const detectedLabel = input.detectedClaude
    ? (input.compatibility === 'newer' ? pc.yellow(`v${input.detectedClaude}`) : pc.green(`v${input.detectedClaude}`))
    : pc.dim('not found');
  const footer: ContentLine[] = [
    pc.white(`claude-sesh v${input.appVersion}`),
    `Compatible with Claude ${pc.green(`v${input.compatibleClaude}`)} ${pc.dim('·')} detected ${detectedLabel}`,
  ];
  if (input.compatibility === 'newer' && input.detectedClaude) {
    footer.push(pc.yellow(
      `⚠ Your Claude (v${input.detectedClaude}) is newer than tested (v${input.compatibleClaude}) — may be unstable.`,
    ));
  }
  if (input.updateAvailable) {
    footer.push(pc.dim(`Update available: v${input.updateAvailable} (choose "Check for updates")`));
  }

  return { title: `${pc.bold('claude-sesh')} v${input.appVersion}`, body, footer };
}

function renderBoxed(width: number, title: string, body: ContentLine[], footer: ContentLine[]): string {
  const lines: string[] = [];
  lines.push(boxTop(title, width));
  lines.push(boxRow('', width));
  for (const line of body) lines.push(boxRow(line, width));
  lines.push(boxRow('', width));
  lines.push(boxDivider(width));
  for (const line of footer) lines.push(boxRow(line, width));
  lines.push(boxBottom(width));
  return lines.join('\n');
}

export function renderHomeScreen(input: HomeScreenInput): string {
  const { title, body, footer } = buildContentLines(input);
  const terminalWidth = process.stdout.columns;
  // Sempre a moldura, sempre do tamanho exato do terminal — nunca mais largo que
  // as colunas reais (o que causaria wrap dentro da célula e desalinhamento) e
  // nunca deixamos de desenhá-la (box.ts trunca com "…" o que não couber).
  const width = terminalWidth ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, terminalWidth)) : MAX_WIDTH;
  return renderBoxed(width, title, body, footer);
}
