import pc from 'picocolors';

/** Pixel art do raio-L da Lumu (gerado a partir do logo oficial). */
export const LOGO_LINES: string[] = [
  '          ▗███████▗',
  '         ▘███████▗',
  '        ▘███████▗',
  '      ▗▘███████▘',
  '     ▗████████▘',
  '    ▗████████▘',
  '   ▘███████▗',
  '   ▅▅▅▅▅▅▅█▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔',
  '        ▗████████████████▗',
  '       ▗████████████████▗',
  '      ▘████████████████▘',
];

/** Retorna a arte já colorida no vermelho do tema. */
export function renderLogo(): string[] {
  return LOGO_LINES.map((line) => pc.red(line));
}

/** Largura visual (em colunas) da logo — maior linha da arte. */
export const LOGO_WIDTH = LOGO_LINES.reduce((max, line) => Math.max(max, line.length), 0);
