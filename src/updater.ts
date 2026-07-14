import { posix } from 'node:path';
import { compareVersions } from './version-compare.js';

export type GithubRelease = {
  tag_name: string;
  html_url: string;
  tarball_url: string;
};

export type UpdateInfo = { latest: string; url: string; tarball: string };

const stripV = (tag: string) => tag.replace(/^v/, '');

type CheckerDeps = {
  currentVersion: string;
  fetchLatest: () => Promise<GithubRelease>;
};

export function createUpdateChecker(deps: CheckerDeps) {
  return async (): Promise<UpdateInfo | null> => {
    try {
      const release = await deps.fetchLatest();
      const latest = stripV(release.tag_name);
      if (compareVersions(latest, deps.currentVersion) <= 0) return null;
      return { latest, url: release.html_url, tarball: release.tarball_url };
    } catch {
      return null;
    }
  };
}

/** owner/repo do repositório GitHub onde os releases são publicados. */
export const GITHUB_REPO = 'lumutech-workspace/claude-sesh';

export async function fetchLatestRelease(repo = GITHUB_REPO): Promise<GithubRelease> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'claude-profile' },
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
  return (await res.json()) as GithubRelease;
}

type ApplierDeps = {
  download: (url: string, dest: string) => Promise<void>;
  extract: (tarball: string, dir: string) => Promise<void>;
  /** Copia os arquivos extraídos (from) por cima da instalação atual (to). */
  sync: (from: string, to: string) => Promise<void>;
  install: (dir: string) => Promise<void>;
  packageDir: string;
  tmpDir: string;
};

export function createUpdateApplier(deps: ApplierDeps) {
  return async (info: UpdateInfo): Promise<void> => {
    try {
      // posix.join mantém barras "/" consistentes em qualquer SO.
      const tarballPath = posix.join(deps.tmpDir, 'release.tar.gz');
      const unpackedDir = posix.join(deps.tmpDir, 'unpacked');
      await deps.download(info.tarball, tarballPath);
      await deps.extract(tarballPath, unpackedDir);
      await deps.sync(unpackedDir, deps.packageDir);
      await deps.install(deps.packageDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Update failed: ${message}. Your current install was left unchanged.`);
    }
  };
}
