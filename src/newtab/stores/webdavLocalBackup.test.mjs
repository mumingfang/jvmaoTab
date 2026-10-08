import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const records = [];
class FakeDexie {
  snapshots = {
    orderBy: () => ({
      last: async () => records.at(-1),
      reverse: () => ({
        toArray: async () => [...records].reverse(),
        offset: (count) => ({
          primaryKeys: async () => [...records].reverse().slice(count).map((row) => row.id)
        })
      })
    }),
    add: async (row) => {
      const id = (records.at(-1)?.id || 0) + 1;
      records.push({ ...row, id });
      return id;
    },
    bulkDelete: async (ids) => {
      for (const id of ids) records.splice(records.findIndex((row) => row.id === id), 1);
    }
  };
  version() { return { stores: () => {} }; }
}

const source = readFileSync(new URL('./webdavLocalBackup.js', import.meta.url), 'utf8')
  .replace(/^import Dexie from 'dexie';\n/, '')
  .replaceAll('export const ', 'const ');
const { saveWebdavLocalBackup, listWebdavLocalBackups } = new Function('Dexie', `
  ${source}
  return { saveWebdavLocalBackup, listWebdavLocalBackups };
`)(FakeDexie);

test('本地备份去重且最多保留三份', async () => {
  const blob = new Blob(['data']);
  await saveWebdavLocalBackup(blob, 'a');
  await saveWebdavLocalBackup(blob, 'a');
  assert.equal((await listWebdavLocalBackups()).length, 1);
  for (const hash of ['b', 'c', 'd']) await saveWebdavLocalBackup(blob, hash);
  assert.deepEqual((await listWebdavLocalBackups()).map((row) => row.contentHash), ['d', 'c', 'b']);
});
