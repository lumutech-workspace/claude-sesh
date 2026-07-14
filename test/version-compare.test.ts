import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVersions, classifyCompatibility } from '../src/version-compare.js';

test('compareVersions orders semantic versions', () => {
  assert.equal(compareVersions('2.1.81', '2.1.81'), 0);
  assert.equal(compareVersions('2.1.80', '2.1.81'), -1);
  assert.equal(compareVersions('2.2.0', '2.1.81'), 1);
  assert.equal(compareVersions('2.1.81', '2.1.9'), 1); // 81 > 9 numerically
  assert.equal(compareVersions('3.0.0', '2.9.9'), 1);
});

test('compareVersions tolerates missing patch/minor', () => {
  assert.equal(compareVersions('2.1', '2.1.0'), 0);
  assert.equal(compareVersions('2', '2.0.0'), 0);
});

test('classifyCompatibility reports ok when equal', () => {
  assert.equal(classifyCompatibility('2.1.81', '2.1.81'), 'ok');
});

test('classifyCompatibility reports newer when installed is ahead', () => {
  assert.equal(classifyCompatibility('2.1.81', '2.2.0'), 'newer');
});

test('classifyCompatibility reports older when installed is behind', () => {
  assert.equal(classifyCompatibility('2.1.81', '2.1.0'), 'older');
});

test('classifyCompatibility reports unknown when not detected', () => {
  assert.equal(classifyCompatibility('2.1.81', null), 'unknown');
});
