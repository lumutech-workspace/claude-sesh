import assert from 'node:assert/strict';
import test from 'node:test';
import pc from 'picocolors';
import { padLine, boxTop, boxBottom, boxDivider, boxRow } from '../src/box.js';

test('padLine pads plain content to the target width', () => {
  assert.equal(padLine('ab', 5), 'ab   ');
  assert.equal(padLine('abcde', 5), 'abcde');
});

test('padLine ignores ANSI escapes when measuring width', () => {
  const colored = '\x1b[31mab\x1b[39m'; // visual width 2
  const padded = padLine(colored, 5);
  // 3 trailing spaces added (5 - 2)
  assert.ok(padded.endsWith('   '));
});

test('boxTop and boxBottom produce matching widths', () => {
  const top = boxTop('title', 20);
  const bottom = boxBottom(20);
  // both are 20 visible columns wide
  assert.equal(stripAnsi(top).length, 20);
  assert.equal(stripAnsi(bottom).length, 20);
});

test('boxRow wraps content with side borders at fixed width', () => {
  const row = boxRow('hi', 10);
  const plain = stripAnsi(row);
  assert.ok(plain.startsWith('│'));
  assert.ok(plain.endsWith('│'));
  assert.equal(plain.length, 10);
});

test('boxRow truncates content longer than width', () => {
  const row = boxRow('x'.repeat(100), 78);
  assert.equal(stripAnsi(row).length, 78);
});

test('boxRow truncates ANSI-colored content longer than width', () => {
  const colored = pc.red('x'.repeat(100));
  const row = boxRow(colored, 78);
  assert.equal(stripAnsi(row).length, 78);
});

test('boxTop truncates a title far longer than width', () => {
  const top = boxTop('a very long title that exceeds width', 20);
  assert.equal(stripAnsi(top).length, 20);
});

test('boxDivider produces corners and matching width', () => {
  const divider = boxDivider(20);
  const plain = stripAnsi(divider);
  assert.ok(plain.startsWith('├'));
  assert.ok(plain.endsWith('┤'));
  assert.equal(plain.length, 20);
});

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}
