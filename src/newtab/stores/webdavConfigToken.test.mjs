import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWebdavConfigToken,
  isWebdavConfigToken,
  parseWebdavConfigToken,
} from './webdavConfigToken.mjs';

const config = {
  webDavURL: 'https://example.test/dav/',
  webDavUsername: 'user@example.test',
  webDavPassword: 'secret-password',
  webDavDir: '/folder',
};

test('一条配置串可在无本地密钥和额外口令的情况下恢复全部配置', async () => {
  const token = await createWebdavConfigToken(config);
  assert.equal(isWebdavConfigToken(token), true);
  assert.equal(token.includes(config.webDavPassword), false);
  assert.deepEqual(await parseWebdavConfigToken(`  ${token}\n`), config);
  assert.notEqual(token, await createWebdavConfigToken(config));
});

test('配置串损坏或缺少字段时拒绝填入', async () => {
  const token = await createWebdavConfigToken(config);
  const parts = token.split('.');
  parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;
  await assert.rejects(parseWebdavConfigToken(parts.join('.')), /无效或已损坏/);
  await assert.rejects(parseWebdavConfigToken('not-a-token'), /格式无效/);
  await assert.rejects(createWebdavConfigToken({ ...config, webDavPassword: '' }), /缺少/);
});
