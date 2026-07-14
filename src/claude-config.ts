import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';

export const oauthAccountSchema = z
  .object({ emailAddress: z.string().email().optional() })
  .catchall(z.unknown())
  .superRefine((account, context) => {
    const tokenField = Object.keys(account).find((key) => /^(access|refresh)?token$/i.test(key));
    if (tokenField) {
      context.addIssue({
        code: 'custom',
        path: [tokenField],
        message: 'OAuth token fields cannot be stored in profile metadata.',
      });
    }
  });

export type OAuthAccount = z.infer<typeof oauthAccountSchema>;

const claudeConfigSchema = z
  .object({ oauthAccount: oauthAccountSchema })
  .catchall(z.unknown());

export type ClaudeConfigSnapshot = {
  contents: string;
  oauthAccount: OAuthAccount;
};

export const defaultClaudeConfigPath = () => join(homedir(), '.claude.json');

async function atomicWrite(path: string, contents: string) {
  const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, contents, 'utf8');
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function readClaudeConfig(path = defaultClaudeConfigPath()): Promise<ClaudeConfigSnapshot> {
  const contents = await readFile(path, 'utf8');
  const config = claudeConfigSchema.parse(JSON.parse(contents));
  return { contents, oauthAccount: config.oauthAccount };
}

export async function replaceOAuthAccount(path: string, oauthAccount: OAuthAccount) {
  const contents = await readFile(path, 'utf8');
  const config = claudeConfigSchema.parse(JSON.parse(contents));
  const next = { ...config, oauthAccount: oauthAccountSchema.parse(oauthAccount) };
  await atomicWrite(path, JSON.stringify(next, null, 2));
}

export async function restoreClaudeConfig(path: string, contents: string) {
  claudeConfigSchema.parse(JSON.parse(contents));
  await atomicWrite(path, contents);
}
