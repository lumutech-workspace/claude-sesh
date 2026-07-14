import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execFileAsync = promisify(execFile);
const authStatusSchema = z.object({
  loggedIn: z.boolean(),
  email: z.string().email().optional(),
  orgName: z.string().optional(),
  subscriptionType: z.string().optional(),
});

export type ClaudeAuthStatus = z.infer<typeof authStatusSchema>;
export type ClaudeIdentity = Omit<ClaudeAuthStatus, 'loggedIn'>;

export function parseClaudeAuthStatus(output: string): ClaudeAuthStatus {
  return authStatusSchema.parse(JSON.parse(output));
}

export function requireClaudeIdentity(status: ClaudeAuthStatus): ClaudeIdentity {
  if (!status.loggedIn) throw new Error('Claude Code is not authenticated.');
  const { loggedIn: _loggedIn, ...identity } = status;
  return identity;
}

export async function readClaudeAuthStatus(): Promise<ClaudeAuthStatus> {
  const { stdout } = await execFileAsync('claude', ['auth', 'status', '--json'], { windowsHide: true });
  return parseClaudeAuthStatus(stdout);
}

export type ClaudeAuthAction = 'login' | 'logout';

export const createClaudeAuthRunner = (spawnProcess: typeof spawn = spawn) =>
  (action: ClaudeAuthAction) => new Promise<void>((resolve, reject) => {
    const child = spawnProcess('claude', ['auth', action], { stdio: 'inherit', windowsHide: false });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        signal
          ? `Claude auth ${action} was terminated by signal ${signal}.`
          : `Claude auth ${action} failed with code ${code ?? 'unknown'}.`,
      ));
    });
  });

export const runClaudeAuth = createClaudeAuthRunner();
