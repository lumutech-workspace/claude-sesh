import assert from 'node:assert/strict';
import test from 'node:test';
import { createUpdateChecker, createUpdateApplier } from '../src/updater.js';

const release = (tag: string) => ({
  tag_name: tag,
  html_url: `https://github.com/o/r/releases/tag/${tag}`,
  tarball_url: `https://api.github.com/repos/o/r/tarball/${tag}`,
});

test('detects an update when latest release is newer', async () => {
  const check = createUpdateChecker({
    currentVersion: '0.1.0',
    fetchLatest: async () => release('v0.2.0'),
  });
  const result = await check();
  assert.deepEqual(result, {
    latest: '0.2.0',
    url: 'https://github.com/o/r/releases/tag/v0.2.0',
    tarball: 'https://api.github.com/repos/o/r/tarball/v0.2.0',
  });
});

test('returns null when already up to date', async () => {
  const check = createUpdateChecker({
    currentVersion: '0.2.0',
    fetchLatest: async () => release('v0.2.0'),
  });
  assert.equal(await check(), null);
});

test('returns null when latest is older (no downgrade)', async () => {
  const check = createUpdateChecker({
    currentVersion: '0.3.0',
    fetchLatest: async () => release('v0.2.0'),
  });
  assert.equal(await check(), null);
});

test('returns null when the network fetch fails', async () => {
  const check = createUpdateChecker({
    currentVersion: '0.1.0',
    fetchLatest: async () => { throw new Error('offline'); },
  });
  assert.equal(await check(), null);
});

test('applyUpdate downloads, extracts, syncs and installs in order', async () => {
  const calls: string[] = [];
  const apply = createUpdateApplier({
    download: async (url, dest) => { calls.push(`download:${url}->${dest}`); },
    extract: async (tarball, dir) => { calls.push(`extract:${tarball}->${dir}`); },
    sync: async (from, to) => { calls.push(`sync:${from}->${to}`); },
    install: async (dir) => { calls.push(`install:${dir}`); },
    packageDir: '/pkg',
    tmpDir: '/tmp/cp-update',
  });
  await apply({ latest: '0.2.0', url: 'u', tarball: 'https://t/tarball' });
  assert.deepEqual(calls, [
    'download:https://t/tarball->/tmp/cp-update/release.tar.gz',
    'extract:/tmp/cp-update/release.tar.gz->/tmp/cp-update/unpacked',
    'sync:/tmp/cp-update/unpacked->/pkg',
    'install:/pkg',
  ]);
});

test('applyUpdate surfaces a clear error when download fails', async () => {
  const apply = createUpdateApplier({
    download: async () => { throw new Error('net down'); },
    extract: async () => {},
    sync: async () => {},
    install: async () => {},
    packageDir: '/pkg',
    tmpDir: '/tmp/cp-update',
  });
  await assert.rejects(() => apply({ latest: '0.2.0', url: 'u', tarball: 't' }), /Update failed/i);
});
