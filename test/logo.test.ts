import assert from 'node:assert/strict';
import test from 'node:test';
import { LOGO_LINES, renderLogo } from '../src/logo.js';

test('LOGO_LINES is a non-empty array of strings', () => {
  assert.ok(Array.isArray(LOGO_LINES));
  assert.ok(LOGO_LINES.length > 0);
  for (const line of LOGO_LINES) assert.equal(typeof line, 'string');
});

test('renderLogo returns one colored line per art line', () => {
  const rendered = renderLogo();
  assert.equal(rendered.length, LOGO_LINES.length);
  // picocolors red wraps content in ANSI escape \x1b[31m ... \x1b[39m
  for (const line of rendered) {
    assert.match(line, /\x1b\[/); // contains an ANSI escape
  }
});
