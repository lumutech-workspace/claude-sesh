import pc from 'picocolors';

const ANSI = /\x1b\[[0-9;]*m/g;

/** Largura visual de uma string, ignorando códigos ANSI. */
export function visibleWidth(s: string): number {
  return s.replace(ANSI, '').length;
}

/** Trunca (sem ANSI) uma string para no máximo `width` colunas visíveis. */
function truncateToWidth(content: string, width: number): string {
  return content.replace(ANSI, '').slice(0, Math.max(0, width));
}

/**
 * Preenche a string com espaços à direita até `width` colunas visíveis.
 * Se `content` exceder `width`, o texto é truncado (perdendo cor, se houver)
 * para garantir que a largura visível resultante seja sempre exatamente `width`.
 */
export function padLine(content: string, width: number): string {
  if (visibleWidth(content) > width) {
    return truncateToWidth(content, width);
  }
  const pad = Math.max(0, width - visibleWidth(content));
  return content + ' '.repeat(pad);
}

/**
 * Linha superior: ╭─ title ─...─╮  (width = colunas totais).
 * Assume width >= 10 (larguras degeneradas < 4 não são tratadas).
 */
export function boxTop(title: string, width: number): string {
  const label = title ? ` ${title} ` : '';
  const inner = width - 2; // sem os cantos
  const dashes = Math.max(0, inner - 1 - visibleWidth(label));
  if (dashes === 0 && visibleWidth(label) > inner - 1) {
    // título não cabe: trunca o label (sem ANSI) para caber exatamente.
    const truncatedLabel = truncateToWidth(label, Math.max(0, inner - 1));
    return pc.red(`╭─${truncatedLabel}${'─'.repeat(Math.max(0, inner - 1 - truncatedLabel.length))}╮`);
  }
  return pc.red(`╭─${label}${'─'.repeat(dashes)}╮`);
}

/** Linha inferior: ╰──...──╯ */
export function boxBottom(width: number): string {
  return pc.red(`╰${'─'.repeat(Math.max(0, width - 2))}╯`);
}

/** Divisória: ├──...──┤ */
export function boxDivider(width: number): string {
  return pc.red(`├${'─'.repeat(Math.max(0, width - 2))}┤`);
}

/** Linha de conteúdo: │ content... │  (width = colunas totais). */
export function boxRow(content: string, width: number): string {
  const inner = width - 4; // 2 bordas + 2 espaços de margem
  const padded = padLine(content, inner);
  return `${pc.red('│')} ${padded} ${pc.red('│')}`;
}
