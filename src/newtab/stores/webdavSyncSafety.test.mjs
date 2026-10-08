import assert from 'node:assert/strict';
import test from 'node:test';
import { canReplaceRemote, decideSync, inspectSnapshot, parseVersion, readRemoteHeader, readRemoteState, sameEtag, sameSnapshotContent, shouldUseRemote, snapshotFingerprint, withSnapshotVersion } from './webdavSyncSafety.mjs';

const snapshot = (links, notes) => JSON.stringify({
  data: {
    databaseName: 'jvmao-tab',
    data: [
      { tableName: 'option', rows: [{ key: 'v', value: 16 }] },
      { tableName: 'link', rows: links },
      { tableName: 'note', rows: notes }
    ]
  }
});

const defaultLinks = [
  '左抽屉', '右抽屉', '暗格', '分组（右击标题可以添加至首屏）',
  '摸鱼爱好者导航', '点击可进行访问', '右击可以删除'
].map((title) => ({ title }));

test('4474 的初始化数据不能覆盖版本 4477 的远端数据', () => {
  const localData = snapshot(defaultLinks, [{ content: '欢迎使用便签' }]);
  const remoteData = snapshot(Array.from({ length: 173 }, (_, i) => ({ title: String(i) })),
    Array.from({ length: 13 }, () => ({ content: 'note' })));
  const localInfo = inspectSnapshot(localData);
  const remoteInfo = inspectSnapshot(remoteData);
  assert.equal(localInfo.isBootstrap, true);
  assert.throws(() => canReplaceRemote({
    expectedVersion: 4474,
    actualVersion: 4477,
    expectedData: remoteData,
    actualData: remoteData,
    localInfo,
    remoteInfo
  }), /远端数据已变化/);
  assert.throws(() => canReplaceRemote({
    expectedVersion: 4477,
    actualVersion: 4477,
    expectedData: remoteData,
    actualData: remoteData,
    localInfo,
    remoteInfo
  }), /初始化数据/);
});

test('同版本但内容改变也不能覆盖', () => {
  const data = snapshot([{ title: 'user link' }], []);
  assert.throws(() => canReplaceRemote({
    expectedVersion: 12,
    actualVersion: 12,
    expectedData: data,
    actualData: snapshot([{ title: 'other link' }], []),
    localInfo: inspectSnapshot(data),
    remoteInfo: inspectSnapshot(data)
  }), /远端数据已变化/);
});

test('版本和数据格式不明时必须停止同步', () => {
  assert.throws(() => parseVersion('4477-error'), /版本号无效/);
  assert.throws(() => inspectSnapshot('{}'), /格式不正确/);
  assert.equal(parseVersion('4477\n'), 4477);
});

test('重新拉取后仅本地版本和连接选项变化仍视为同一份数据', () => {
  const make = (options) => JSON.stringify({ data: { databaseName: 'jvmao-tab', data: [
    { tableName: 'option', rows: options.map(([key, value]) => ({ key, value })) },
    { tableName: 'link', rows: [{ title: 'saved link' }] },
    { tableName: 'note', rows: [{ content: 'saved note' }] }
  ] } });
  const remote = make([['webdavVersion', 4472], ['tabTitle', '我的首页']]);
  const local = make([['webdavVersion', 4477], ['webdavOpen', true], ['tabTitle', '我的首页']]);
  assert.equal(sameSnapshotContent(remote, local), true);
  assert.equal(sameSnapshotContent(remote, make([['tabTitle', '已修改']])), false);
});

test('远端优先：本地版本更高或同版本内容不同都选择远端', () => {
  const remoteData = snapshot([{ title: 'remote' }], [{ content: 'remote note' }]);
  const localData = snapshot([{ title: 'local' }], [{ content: 'local note' }]);
  assert.equal(shouldUseRemote({ remoteVersion: 4477, localVersion: 4478, remoteData, localData }), true);
  assert.equal(shouldUseRemote({ remoteVersion: 4477, localVersion: 4477, remoteData, localData }), true);
  assert.equal(shouldUseRemote({ remoteVersion: 4477, localVersion: 4477, remoteData, localData: remoteData }), false);
});

test('版本文件缺失但数据文件存在时禁止把远端当作空目录', async () => {
  const client = { getFileContents: async (path) => {
    if (path.endsWith('jvmao-version.txt')) throw Object.assign(new Error('404'), { status: 404 });
    return snapshot([{ title: 'saved' }], []);
  } };
  await assert.rejects(readRemoteState(client, '/folder'), /不完整/);
});

test('远端读取失败时不把错误当作空目录', async () => {
  const client = { getFileContents: async () => { throw new Error('network timeout'); } };
  await assert.rejects(readRemoteState(client, '/folder'), /network timeout/);
});

test('读取远端文件时保留 ETag 供条件写入使用', async () => {
  const client = { getFileContents: async (path) => ({
    data: path.endsWith('jvmao-version.txt') ? '4477' : snapshot([{ title: 'saved' }], []),
    headers: { etag: path.endsWith('jvmao-version.txt') ? '"version"' : '"data"' }
  }) };
  const remote = await readRemoteState(client, '/folder');
  assert.equal(remote.version, 4477);
  assert.equal(remote.versionEtag, '"version"');
  assert.equal(remote.dataEtag, '"data"');
});

test('新标签保留尚未上传的本地修改', () => {
  assert.equal(decideSync({ hasBaseline: true, remoteChanged: false, localChanged: true, remoteExists: true }), 'push');
  assert.equal(decideSync({ hasBaseline: true, remoteChanged: false, localChanged: false, remoteExists: true }), 'skip');
  assert.equal(decideSync({ hasBaseline: true, remoteChanged: true, localChanged: true, remoteExists: true }), 'pull');
  assert.equal(decideSync({ hasBaseline: false, remoteChanged: true, localChanged: true, remoteExists: true }), 'pull');
  assert.equal(decideSync({ hasBaseline: true, remoteChanged: true, localChanged: false, remoteExists: false }), 'stop');
});

test('指纹忽略同步版本和连接信息，但识别用户内容修改', async () => {
  const make = (title, version) => JSON.stringify({ data: { databaseName: 'jvmao-tab', data: [
    { tableName: 'option', rows: [{ key: 'webdavVersion', value: version }, { key: 'webDavPassword', value: 'hidden' }] },
    { tableName: 'link', rows: [{ title }] },
    { tableName: 'note', rows: [{ content: 'note' }] }
  ] } });
  assert.equal(await snapshotFingerprint(make('saved', 4474)), await snapshotFingerprint(make('saved', 4477)));
  assert.notEqual(await snapshotFingerprint(make('saved', 4477)), await snapshotFingerprint(make('changed', 4477)));
});

test('元数据读取同时确认两个远端文件存在', async () => {
  const requested = [];
  const client = {
    getFileContents: async (path) => {
      requested.push(['GET', path]);
      return { data: '4477', headers: { etag: '"version"' } };
    },
    stat: async (path) => {
      requested.push(['PROPFIND', path]);
      return { etag: 'data', size: 76590 };
    }
  };
  assert.deepEqual(await readRemoteHeader(client, '/folder'), {
    version: 4477, versionEtag: '"version"', dataEtag: 'data', rawDataEtag: 'data', dataSize: 76590
  });
  assert.deepEqual(requested, [
    ['GET', '/folder/jvmao-version.txt'],
    ['PROPFIND', '/folder/jvmao-tab.json']
  ]);
  await assert.rejects(readRemoteHeader({
    getFileContents: client.getFileContents,
    stat: async () => { throw Object.assign(new Error('404'), { status: 404 }); }
  }, '/folder'), /不完整/);
});

test('ETag 比较兼容服务器不带引号和标准带引号的返回值', () => {
  assert.equal(sameEtag('wA4YGgpdZ9PGcd1TvmSjvA', '"wA4YGgpdZ9PGcd1TvmSjvA"'), true);
  assert.equal(sameEtag('W/abc', 'W/"abc"'), true);
  assert.equal(sameEtag('abc', 'def'), false);
  assert.equal(sameEtag(null, 'abc'), false);
});

test('上传副本先写入新版本，不提前修改本地快照', () => {
  const original = JSON.stringify({ data: { databaseName: 'jvmao-tab', data: [
    { tableName: 'option', rows: [{ key: 'webdavVersion', value: 4478 }] },
    { tableName: 'link', rows: [{ title: 'saved' }] },
    { tableName: 'note', rows: [{ content: 'note' }] }
  ] } });
  const next = withSnapshotVersion(original, 4479);
  assert.equal(JSON.parse(original).data.data[0].rows[0].value, 4478);
  assert.equal(JSON.parse(next).data.data[0].rows[0].value, 4479);
});
