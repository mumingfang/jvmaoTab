import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Blob } from 'node:buffer';
import * as safety from './webdavSyncSafety.mjs';

// Run the real DataStores control flow with an in-memory WebDAV server and DB.
// Imports are replaced so the browser-only stores can run in Node.
const source = readFileSync(new URL('./DataStores.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\n/gm, '')
  .replace('export default class DataStores', 'class DataStores');
const DataStores = new Function('deps', `
  const { observable, action, computed, makeObservable, autorun, createClient,
    db, handleError, _, canReplaceRemote, decideSync, fileFingerprint,
    inspectSnapshot, parseVersion, readRemoteHeader, readRemoteState, sameEtag,
    snapshotFingerprint, withSnapshotVersion } = deps;
  ${source}
  return DataStores;
`)({
  observable: {}, action: {}, computed: {}, makeObservable: () => {}, autorun: () => {},
  createClient: () => ({}), db: {}, handleError: () => {},
  _: { debounce: (fn) => Object.assign(fn, { cancel: () => {} }) }, ...safety
});

const snapshot = (title, bootstrap = false, version = 4477) => JSON.stringify({ data: {
  databaseName: 'jvmao-tab', data: [
    { tableName: 'option', rows: [
      { key: 'homeId', value: 'home' }, { key: 'webdavVersion', value: version }
    ] },
    { tableName: 'link', rows: bootstrap
      ? ['左抽屉', '右抽屉', '暗格', '分组（右击标题可以添加至首屏）',
        '摸鱼爱好者导航', '点击可进行访问', '右击可以删除'].map((name) => ({ title: name }))
      : [{ title }] },
    { tableName: 'note', rows: [{ content: bootstrap ? '欢迎使用便签' : 'saved note' }] }
  ]
} });

const setup = (localText, remoteText, version = 4477, etag = true, quotedGetEtag = true) => {
  let local = localText;
  let remote = remoteText;
  let remoteVersion = version;
  let dataGeneration = 1;
  let versionGeneration = 1;
  let failVersionWrite = false;
  const errors = [];
  const requests = [];
  const storage = {};
  const getDataEtag = () => quotedGetEtag ? `"data-${dataGeneration}"` : `data-${dataGeneration}`;
  globalThis.chrome = {
    runtime: { lastError: null },
    storage: { local: {
      get: (_key, done) => done(storage),
      set: (value, done) => { Object.assign(storage, value); done(); }
    } }
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true, value: { locks: { request: (_name, _options, operation) => operation() } }
  });
  const root = {
    option: { item: {
      webDavURL: 'https://example.test/dav', webDavUsername: 'user',
      webDavPassword: 'secret', webDavDir: '/folder', webdavVersion: 1,
      webdavExpectedRemote: true
    }, setItem: async function (key, value) { this.item[key] = value; } },
    tools: { error: (message) => errors.push(message) }
  };
  const store = new DataStores(root);
  store.client = {};
  store.dir = '/folder';
  store.ready = true;
  store.get_dbData = async () => new Blob([local]);
  store.readRemoteHeader = async () => {
    requests.push('header');
    return { version: remoteVersion, dataEtag: etag ? `data-${dataGeneration}` : null,
      versionEtag: etag ? `"version-${versionGeneration}"` : null };
  };
  store.readRemoteState = async () => {
    requests.push('data');
    const info = safety.inspectSnapshot(remote);
    return { version: remoteVersion, data: remote, info, embeddedVersion: info.embeddedVersion,
      dataEtag: etag ? getDataEtag() : null,
      versionEtag: etag ? `"version-${versionGeneration}"` : null };
  };
  store._pull = async (_version, data) => { local = data; requests.push('import'); return true; };
  store.writeFile = async (path, blob, options = {}) => {
    requests.push(`PUT ${path}`);
    if (path.endsWith('/jvmao-tab.json')) {
      if (options.headers?.['If-Match'] !== undefined) {
        assert.equal(options.headers['If-Match'], getDataEtag());
      }
      remote = await blob.text();
      dataGeneration += 1;
    }
    if (path.endsWith('/jvmao-version.txt')) {
      if (failVersionWrite) {
        failVersionWrite = false;
        throw new Error('version PUT failed');
      }
      remoteVersion = Number(await blob.text());
      versionGeneration += 1;
    }
  };
  return { store, root, storage, requests, errors, getLocal: () => local,
    getRemote: () => remote, getVersion: () => remoteVersion,
    changeLocal: (value) => { local = value; },
    changeRemote: (value, nextVersion) => {
      remote = value; remoteVersion = nextVersion;
      dataGeneration += 1; versionGeneration += 1;
    },
    failNextVersionWrite: () => { failVersionWrite = true; } };
};

test('重新安装后的默认数据只拉取远端，绝不写入 4477', async () => {
  const remote = snapshot('173 user links');
  const state = setup(snapshot('', true), remote);
  await state.store.pull();
  assert.equal(state.getLocal(), remote);
  assert.equal(state.getRemote(), remote);
  assert.equal(state.getVersion(), 4477);
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
  assert.deepEqual(state.errors, []);
});

test('新标签发现待上传本地修改时上传，不拉回旧远端', async () => {
  const state = setup(snapshot('original'), snapshot('original'));
  await state.store.pull();
  state.requests.length = 0;
  state.changeLocal(snapshot('new local edit'));
  await state.store.pull();
  assert.equal(state.getRemote(), snapshot('new local edit', false, 4478));
  assert.equal(state.getVersion(), 4478);
  assert.equal(state.requests.includes('import'), false);
  assert.deepEqual(state.errors, []);
});

test('新标签无变化时不下载完整 JSON', async () => {
  const state = setup(snapshot('original'), snapshot('original'));
  await state.store.pull();
  state.requests.length = 0;
  await state.store.pull();
  assert.deepEqual(state.requests, ['header']);
});

test('实际服务这种不带引号的 GET ETag 可正常拉取和上传', async () => {
  const state = setup(snapshot('saved'), snapshot('saved'), 4477, true, false);
  await state.store.pull();
  assert.deepEqual(state.errors, []);
  state.changeLocal(snapshot('new edit'));
  await state.store.pull();
  assert.equal(state.getRemote(), snapshot('new edit', false, 4478));
  assert.equal(state.getVersion(), 4478);
  assert.deepEqual(state.errors, []);
});

test('两边都变更时远端胜出，且不会上传本地旧数据', async () => {
  const state = setup(snapshot('original'), snapshot('original'));
  await state.store.pull();
  state.requests.length = 0;
  state.changeLocal(snapshot('local edit'));
  state.changeRemote(snapshot('remote edit', false, 4478), 4478);
  await state.store.pull();
  assert.equal(state.getLocal(), snapshot('remote edit', false, 4478));
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
});

test('服务器没有 ETag 时可以拉取，但不能覆盖已有远端文件', async () => {
  const state = setup(snapshot('original'), snapshot('original'), 4477, false);
  await state.store.pull();
  state.requests.length = 0;
  state.changeLocal(snapshot('local edit'));
  await state.store.pull();
  assert.equal(state.getRemote(), snapshot('original'));
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
  assert.match(state.errors.at(-1), /未提供文件 ETag/);
});

test('本地被重置成默认数据但基线仍在时拉回远端', async () => {
  const state = setup(snapshot('saved'), snapshot('saved'));
  await state.store.pull();
  state.requests.length = 0;
  state.changeLocal(snapshot('', true));
  await state.store.pull();
  assert.equal(state.getLocal(), snapshot('saved'));
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
});

test('远端版本号没变但 JSON 被替换时仍拉取远端', async () => {
  const state = setup(snapshot('saved'), snapshot('saved'));
  await state.store.pull();
  state.changeRemote(snapshot('changed elsewhere'), 4477);
  state.changeLocal(snapshot('local edit'));
  state.requests.length = 0;
  await state.store.pull();
  assert.equal(state.getLocal(), snapshot('changed elsewhere'));
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
});

test('版本文件上传失败时恢复上一版远端数据', async () => {
  const state = setup(snapshot('saved'), snapshot('saved'));
  await state.store.pull();
  const previousLocalVersion = state.root.option.item.webdavVersion;
  state.changeLocal(snapshot('local edit'));
  state.failNextVersionWrite();
  await state.store.push();
  assert.equal(state.getRemote(), snapshot('saved'));
  assert.equal(state.getVersion(), 4477);
  assert.equal(state.root.option.item.webdavVersion, previousLocalVersion);
  assert.match(state.errors.at(-1), /version PUT failed/);
});

test('远端两次读取不一致时输出可复制的诊断信息且不上传', async () => {
  const state = setup(snapshot('', true), snapshot('saved'));
  const originalHeader = state.store.readRemoteHeader;
  state.store.readRemoteHeader = async () => ({
    ...await originalHeader(), dataEtag: '"old-data"', rawDataEtag: 'old-data', dataSize: 100
  });
  const originalError = console.error;
  let diagnostic;
  console.error = (tag, details) => { diagnostic = { tag, details }; };
  try {
    await state.store.pull();
  } finally {
    console.error = originalError;
  }
  assert.match(diagnostic.tag, /remote-snapshot-inconsistent/);
  assert.equal(diagnostic.details.attempts.length, 3);
  assert.deepEqual(diagnostic.details.attempts[0].reason, ['data-etag', 'data-size']);
  assert.equal(diagnostic.details.attempts[0].before.dataEtag, '"old-data"');
  assert.equal(diagnostic.details.attempts[0].downloaded.version, 4477);
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
  assert.equal(state.getLocal(), snapshot('', true));
});

test('短暂读到旧 GET 内容时重新读取并继续拉取', async () => {
  const state = setup(snapshot('', true), snapshot('new remote'));
  const originalRead = state.store.readRemoteState;
  let reads = 0;
  state.store.readRemoteState = async () => {
    const result = await originalRead();
    reads += 1;
    return reads === 1
      ? { ...result, data: snapshot('stale remote'), dataEtag: '"old-data"' }
      : result;
  };
  await state.store.pull();
  assert.equal(state.getLocal(), snapshot('new remote'));
  assert.ok(reads >= 2);
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
  assert.deepEqual(state.errors, []);
});

test('数据文件 4479 但版本文件 4478 时停止拉取和上传', async () => {
  const state = setup(snapshot('saved'), snapshot('changed', false, 4479), 4478);
  const originalError = console.error;
  let diagnostic;
  console.error = (_tag, details) => { diagnostic = details; };
  try {
    await state.store.pull();
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(diagnostic.attempts[0].reason, ['embedded-version']);
  assert.equal(state.requests.includes('import'), false);
  assert.equal(state.requests.some((request) => request.startsWith('PUT ')), false);
  assert.match(state.errors.at(-1), /持续不一致/);
});
