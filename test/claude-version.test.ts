import assert from 'node:assert/strict';
import test from 'node:test';
import { parseClaudeVersion, createClaudeVersionReader } from '../src/claude-version.js';

test('parseClaudeVersion extracts version from claude --version output', () => {
  assert.equal(parseClaudeVersion('2.1.81 (Claude Code)'), '2.1.81');
  assert.equal(parseClaudeVersion('  1.0.0 (Claude Code)\n'), '1.0.0');
  assert.equal(parseClaudeVersion('claude 2.3.4'), '2.3.4');
});

test('parseClaudeVersion returns null when no version present', () => {
  assert.equal(parseClaudeVersion('not a version'), null);
  assert.equal(parseClaudeVersion(''), null);
});

test('createClaudeVersionReader returns parsed version on success', async () => {
  const reader = createClaudeVersionReader(async () => ({ stdout: '2.1.81 (Claude Code)', stderr: '' }));
  assert.equal(await reader(), '2.1.81');
});

test('createClaudeVersionReader returns null when command fails', async () => {
  const reader = createClaudeVersionReader(async () => { throw new Error('ENOENT'); });
  assert.equal(await reader(), null);
});
