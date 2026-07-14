import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function parseClaudeVersion(output: string): string | null {
  const match = output.match(/\d+\.\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

type ExecResult = { stdout: string; stderr: string };
type Exec = (command: string, args: string[]) => Promise<ExecResult>;

export function createClaudeVersionReader(exec: Exec) {
  return async (): Promise<string | null> => {
    try {
      const { stdout } = await exec('claude', ['--version']);
      return parseClaudeVersion(stdout);
    } catch {
      return null;
    }
  };
}

export const readInstalledClaudeVersion = createClaudeVersionReader(
  (command, args) =>
    execFileAsync(command, args, { windowsHide: true }).then((result) => ({
      stdout: String(result.stdout),
      stderr: String(result.stderr),
    })),
);
