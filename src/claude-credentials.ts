import { copyFile, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const defaultCredentialsPath = () => join(homedir(), '.claude', '.credentials.json');

export async function replaceCredentials(path: string, contents: string) {
  const parsed: unknown = JSON.parse(contents);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid credentials');
  const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, contents, 'utf8');
    await copyFile(path, `${path}.backup`);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function readCredentials(path = defaultCredentialsPath()) {
  const contents = await readFile(path, 'utf8');
  JSON.parse(contents);
  return contents;
}
