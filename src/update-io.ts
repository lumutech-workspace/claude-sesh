import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Diretório raiz do pacote instalado (onde está o package.json). */
export function resolvePackageDir(): string {
  // Este arquivo compila para dist/update-io.js; a raiz do pacote é um nível acima de dist/.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..');
}

/** Diretório temporário exclusivo para a atualização. */
export function resolveTmpDir(): string {
  return join(tmpdir(), 'claude-profile-update');
}

/** Baixa uma URL para um arquivo local (segue redirects do GitHub/codeload). */
export async function download(url: string, dest: string): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'claude-profile' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(dest));
}

/** Extrai um tarball .tar.gz para um diretório (usa o tar nativo do Windows 10+/Unix). */
export async function extract(tarball: string, dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // --force-local impede que o tar (bsdtar/GNU) interprete "F:" como host remoto.
  await execFileAsync('tar', ['--force-local', '-xzf', tarball, '-C', dir], { windowsHide: true });
}

/**
 * Copia os arquivos da release por cima da instalação atual.
 * O tarball do GitHub extrai numa única subpasta (owner-repo-hash/); copiamos
 * o conteúdo dela para o pacote, ignorando node_modules e .git.
 */
export async function sync(from: string, to: string): Promise<void> {
  const entries = await readdir(from, { withFileTypes: true });
  const roots = entries.filter((e) => e.isDirectory());
  // GitHub tarballs têm exatamente uma pasta raiz; se não, usa `from` direto.
  const sourceRoot = roots.length === 1 ? join(from, roots[0].name) : from;
  await cp(sourceRoot, to, {
    recursive: true,
    force: true,
    filter: (src) => !src.includes(`${'node_modules'}`) && !src.includes(`${'.git'}`),
  });
}

/** Instala dependências e recompila no diretório do pacote. */
export async function install(dir: string): Promise<void> {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await execFileAsync(npm, ['install'], { cwd: dir, windowsHide: true });
  await execFileAsync(npm, ['run', 'build'], { cwd: dir, windowsHide: true });
}
