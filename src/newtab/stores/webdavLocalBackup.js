import Dexie from 'dexie';

// 与主数据库分开；db.delete() 不会删除拉取前保存的快照。
const backupDb = new Dexie('jvmao-tab-webdav-local-backups');
backupDb.version(1).stores({ snapshots: '++id,createdAt,contentHash' });

const MAX_BACKUPS = 3;

export const saveWebdavLocalBackup = async (blob, contentHash) => {
  const latest = await backupDb.snapshots.orderBy('id').last();
  if (latest?.contentHash === contentHash) return latest.id;

  const id = await backupDb.snapshots.add({
    createdAt: Date.now(),
    contentHash,
    blob
  });
  // 清理只影响本机的旧同步备份，不触碰 WebDAV 上已有的历史文件。
  try {
    const oldIds = await backupDb.snapshots.orderBy('id').reverse()
      .offset(MAX_BACKUPS).primaryKeys();
    if (oldIds.length) await backupDb.snapshots.bulkDelete(oldIds);
  } catch (error) {
    console.warn('[WebDAV 同步] 本地旧备份清理失败，新备份已保留', error);
  }
  return id;
};

export const listWebdavLocalBackups = () => backupDb.snapshots.orderBy('id').reverse().toArray();
