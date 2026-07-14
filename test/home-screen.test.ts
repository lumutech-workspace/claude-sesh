import assert from 'node:assert/strict';
import test from 'node:test';
import { renderHomeScreen } from '../src/home-screen.js';

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

const base = {
  appVersion: '0.1.0',
  compatibleClaude: '2.1.81',
  detectedClaude: '2.1.81',
  compatibility: 'ok' as const,
  profileName: 'Murilo',
};

test('renders welcome with profile name', () => {
  const out = stripAnsi(renderHomeScreen(base));
  assert.match(out, /Welcome back, Murilo!/);
});

test('renders generic welcome without profile name', () => {
  const out = stripAnsi(renderHomeScreen({ ...base, profileName: undefined }));
  assert.match(out, /Welcome/);
  assert.doesNotMatch(out, /Murilo/);
});

test('renders footer with all three versions and the new labels', () => {
  const out = stripAnsi(renderHomeScreen(base));
  assert.match(out, /claude-sesh v0\.1\.0/);
  assert.match(out, /Compatible with Claude v2\.1\.81/);
  assert.match(out, /detected v2\.1\.81/);
});

test('shows incompatibility warning when detected is newer', () => {
  const out = stripAnsi(renderHomeScreen({
    ...base, detectedClaude: '2.2.0', compatibility: 'newer',
  }));
  assert.match(out, /newer than tested/i);
  assert.match(out, /2\.2\.0/);
});

test('shows "not found" when Claude version is unknown', () => {
  const out = stripAnsi(renderHomeScreen({
    ...base, detectedClaude: null, compatibility: 'unknown',
  }));
  assert.match(out, /detected .*not found/i);
});

test('shows update line when an update is available', () => {
  const out = stripAnsi(renderHomeScreen({ ...base, updateAvailable: '0.2.0' }));
  assert.match(out, /Update available: v0\.2\.0/);
});

test('includes tips', () => {
  const out = stripAnsi(renderHomeScreen(base));
  assert.match(out, /Tips/);
  assert.match(out, /login/);
});

test('shows the active profile name', () => {
  const out = stripAnsi(renderHomeScreen(base));
  assert.match(out, /Active profile: Murilo/);
});

test('shows a fallback when there is no active profile', () => {
  const out = stripAnsi(renderHomeScreen({ ...base, profileName: undefined }));
  assert.match(out, /No active profile yet\./);
});

test('keeps the box border and a single consistent width on narrow terminals', () => {
  const original = process.stdout.columns;
  Object.defineProperty(process.stdout, 'columns', { value: 40, configurable: true });
  try {
    const out = stripAnsi(renderHomeScreen(base));
    assert.match(out, /╭/);
    const lines = out.split('\n');
    const widths = new Set(lines.map((line) => line.length));
    assert.equal(widths.size, 1, `expected a single consistent width, got: ${[...widths]}`);
    // Conteúdo mais longo que a largura é truncado com "…", nunca quebra para a linha seguinte.
    assert.match(out, /…/);
  } finally {
    Object.defineProperty(process.stdout, 'columns', { value: original, configurable: true });
  }
});

test('keeps the box border and a single consistent width on wide terminals', () => {
  const original = process.stdout.columns;
  Object.defineProperty(process.stdout, 'columns', { value: 100, configurable: true });
  try {
    const out = stripAnsi(renderHomeScreen(base));
    assert.match(out, /╭/);
    const lines = out.split('\n');
    const widths = new Set(lines.map((line) => line.length));
    assert.equal(widths.size, 1, `expected a single consistent width, got: ${[...widths]}`);
  } finally {
    Object.defineProperty(process.stdout, 'columns', { value: original, configurable: true });
  }
});
