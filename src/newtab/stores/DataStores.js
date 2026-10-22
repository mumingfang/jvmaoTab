import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import {
  createClient
} from 'webdav';
import {
  db
} from "~/db";
import { handleError } from "~/utils/errorHandler";
import _ from "lodash";
import { canReplaceRemote, decideSync, fileFingerprint, inspectSnapshot, parseVersion, readRemoteHeader, readRemoteState, sameEtag, snapshotFingerprint, withSnapshotVersion } from './webdavSyncSafety.mjs';
import { saveWebdavLocalBackup } from './webdavLocalBackup.js';

const devJsonName = '/jvmao-tab.json';
const devVName = '/jvmao-version.txt';

const localStorageKeys = ['bgType', 'bg2Type', 'bgBase64', 'bg2Base64', 'webdavVersion', 'webDavURL', 'webDavUsername', 'webDavPassword', 'webDavDir', 'webdavExpectedRemote'];
const baselineStorageKey = 'webdavSyncBaseline';

const progressCallback = () => {}
export default class DataStores {
  client = null;
  dir = '';
  lock = false;
  waitType = '';
  cache = {};
  ready = false;
  remoteVersion = null;
  remoteData = null;
  remoteEtag = null;
  dirtyDuringPush = false;
  suppressUpdates = false;
  connectionKey = '';
  baseline = null;
  syncConflict = null;
  conflictChoice = null;
  forceLocalConflict = null;

  constructor(rootStore) {
    makeObservable(this, {
      waitType: observable,
      syncConflict: observable,
      test: action,
      init: action,
      pull: action,
      push: action,
      readFile: action,
      writeFile: action,
      get_dbData: action,
      update: action,
    });
    this.rootStore = rootStore;
  }

  test = async (url, username, password, dir) => {
    const client = createClient(url, {
      username,
      password
    });
    const testPath = dir + '/jvmao-init.text';
    try {
      await client.putFileContents(testPath, '1', { overwrite: true });
      await client.deleteFile(testPath);
      const remote = await this.readRemoteState(client, dir);
      return remote.data === null ? 0 : 1;
    } catch (error) {
      handleError(error, 'DataStores.test');
      throw error;
    }
  }

  init = async () => {
    const {
      webDavURL = '',
        webDavUsername = '',
        webDavPassword = '',
        webDavDir = '',
        webdavTime = 3,
    } = this.rootStore.option.item;

    if (!webDavURL || !webDavUsername || !webDavPassword || !webDavDir) {
      return;
    }

    const connectionKey = JSON.stringify([webDavURL, webDavUsername, webDavPassword, webDavDir]);
    if (!this.client || this.connectionKey !== connectionKey) {
      this._update.cancel?.();
      this.ready = false;
      this.remoteVersion = null;
      this.remoteData = null;
      this.remoteEtag = null;
      this.baseline = null;
      this.dir = webDavDir;
      this.connectionKey = connectionKey;
      this._update = _.debounce(() => {
        this.push();
      }, 1000 * webdavTime)
      this.client = createClient(webDavURL, {
        username: webDavUsername,
        password: webDavPassword
      });
    }

    return this.pull();
  }

  readRemoteState = async (client = this.client, dir = this.dir) => {
    return readRemoteState(client, dir);
  }

  readRemoteHeader = async (client = this.client, dir = this.dir) => {
    return readRemoteHeader(client, dir);
  }

  readVerifiedRemoteState = async (initialHeader) => {
    let before = initialHeader || await this.readRemoteHeader();
    const attempts = [];
    let stableVersionMismatch = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const remote = await this.readRemoteState();
      const after = await this.readRemoteHeader();
      const downloadedSize = remote.data === null ? null : new Blob([remote.data]).size;
      const versionMismatch = before.version !== remote.version || after.version !== remote.version;
      const embeddedVersionMismatch = remote.embeddedVersion != null &&
        remote.embeddedVersion !== remote.version;
      const etagMismatch = !!(before.dataEtag && remote.dataEtag &&
        !sameEtag(before.dataEtag, remote.dataEtag)) ||
        !!(after.dataEtag && remote.dataEtag && !sameEtag(after.dataEtag, remote.dataEtag));
      const sizeMismatch = (before.dataSize != null && before.dataSize !== downloadedSize) ||
        (after.dataSize != null && after.dataSize !== downloadedSize);
      if (!versionMismatch && !embeddedVersionMismatch && !etagMismatch && !sizeMismatch) {
        return { header: after, remote };
      }
      // A two-file upload can leave a valid JSON snapshot ahead of its version
      // marker. Accept it only after three identical full downloads.
      const stableHeaders = before.versionEtag === after.versionEtag &&
        before.dataEtag === after.dataEtag && before.dataSize === after.dataSize;
      if (remote.embeddedVersion === remote.version + 1 && stableHeaders &&
          !versionMismatch && !etagMismatch && !sizeMismatch) {
        const sameSnapshot = stableVersionMismatch &&
          stableVersionMismatch.remote.data === remote.data &&
          stableVersionMismatch.remote.version === remote.version &&
          stableVersionMismatch.remote.embeddedVersion === remote.embeddedVersion &&
          stableVersionMismatch.header.dataEtag === after.dataEtag &&
          stableVersionMismatch.header.dataSize === after.dataSize &&
          stableVersionMismatch.header.versionEtag === after.versionEtag;
        stableVersionMismatch = sameSnapshot
          ? { count: stableVersionMismatch.count + 1, header: after, remote }
          : { count: 1, header: after, remote };
        if (stableVersionMismatch.count === 3) {
          console.warn('[WebDAV 同步] 远端 JSON 版本与版本文件稳定不一致，等待用户选择', {
            markerVersion: remote.version, snapshotVersion: remote.embeddedVersion
          });
          return { header: after, remote, versionConflict: true };
        }
      } else {
        stableVersionMismatch = null;
      }
      attempts.push({
        reason: [versionMismatch && 'version', embeddedVersionMismatch && 'embedded-version',
          etagMismatch && 'data-etag',
          sizeMismatch && 'data-size'].filter(Boolean),
        before: { version: before.version, dataEtag: before.dataEtag, dataSize: before.dataSize },
        downloaded: {
          version: remote.version, embeddedVersion: remote.embeddedVersion,
          dataEtag: remote.dataEtag, dataSize: downloadedSize
        },
        after: { version: after.version, dataEtag: after.dataEtag, dataSize: after.dataSize }
      });
      before = after;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
    console.error('[WebDAV 同步][remote-snapshot-inconsistent]', {
      attempts, checkedAt: new Date().toISOString()
    });
    throw new Error('远端文件状态与下载内容持续不一致，已停止同步，请稍后重试');
  }

  connectionId = () => JSON.stringify([
    this.rootStore.option.item.webDavURL,
    this.rootStore.option.item.webDavUsername,
    this.rootStore.option.item.webDavDir
  ]);

  loadBaseline = async () => {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(baselineStorageKey, (value) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(value || {});
      });
    });
    const baseline = result[baselineStorageKey];
    this.baseline = baseline?.connectionId === this.connectionId() &&
      Number.isSafeInteger(baseline.version) && baseline.localHash && baseline.remoteHash
      ? baseline : null;
    return this.baseline;
  }

  saveBaseline = async (version, dataEtag, localHash, remoteHash = localHash) => {
    const baseline = { connectionId: this.connectionId(), version, dataEtag, localHash, remoteHash };
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [baselineStorageKey]: baseline }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
    this.baseline = baseline;
  }

  withProfileLock = (operation) => {
    if (navigator.locks?.request) {
      return navigator.locks.request('jvmao-webdav-sync', { mode: 'exclusive' }, operation);
    }
    return operation();
  }

  resolveConflict = async (choice) => {
    if (!this.syncConflict || !['remote', 'local', 'retry'].includes(choice)) return;
    this.conflictChoice = choice === 'retry' ? null : {
      choice, id: this.syncConflict.id, localHash: this.syncConflict.localHash
    };
    await this.pull();
  }

  pull = async () => {
    const pushLocal = await this.withProfileLock(() => this.pullLocked());
    if (pushLocal && this.ready) await this.push();
  }

  pullLocked = async () => {
    if (this.lock) {
      return;
    }
    this.lock = true;
    this.ready = false;
    this.waitType = 'pull';
    let pushLocal = false;
    try {
      let header = await this.readRemoteHeader();
      const baseline = await this.loadBaseline();
      const localVersion = parseVersion(this.rootStore.option.item.webdavVersion ?? 1);
      if (header.version === null) {
        if (baseline || this.rootStore.option.item.webdavExpectedRemote || localVersion > 1) {
          throw new Error('预期远端已有数据，但未读到数据文件；已停止上传');
        }
        this.remoteVersion = null;
        this.remoteData = null;
        this.remoteEtag = null;
        this.ready = true;
        // 空目录不自动接收初始化数据；已有真实数据也等下一次用户修改再上传。
        return;
      }
      const localBlob = await this.get_dbData();
      const localData = await localBlob.text();
      const localInfo = inspectSnapshot(localData);
      const localHash = await snapshotFingerprint(localData);
      // ETag 缺失时不能用大小或修改时间猜测内容，必须读取完整文件核对。
      const metadataMatches = baseline && header.dataEtag &&
        header.version === baseline.version && sameEtag(header.dataEtag, baseline.dataEtag);
      const verified = metadataMatches ? null : await this.readVerifiedRemoteState(header);
      if (verified) header = verified.header;
      const remote = verified?.remote || null;
      const remoteHash = remote ? await fileFingerprint(remote.data) : baseline.remoteHash;
      const conflictId = verified?.versionConflict
        ? `${remote.version}:${remote.embeddedVersion}:${remoteHash}` : null;
      const choice = this.conflictChoice;
      this.conflictChoice = null;
      if (choice && !conflictId) {
        this.rootStore.tools.error('远端在选择期间已变化，请先重新检查');
        return;
      }
      if (conflictId && (!choice || choice.id !== conflictId || choice.localHash !== localHash)) {
        this.syncConflict = {
          id: conflictId, localHash, localVersion, localLinks: localInfo.links,
          localNotes: localInfo.notes, localIsBootstrap: localInfo.isBootstrap,
          remoteVersion: remote.version, snapshotVersion: remote.embeddedVersion,
          remoteLinks: remote.info.links, remoteNotes: remote.info.notes,
          remoteSize: new Blob([remote.data]).size
        };
        return;
      }
      if (conflictId && choice.choice === 'local') {
        if (localInfo.isBootstrap) throw new Error('本地是初始化数据，不能覆盖远端数据');
        this.forceLocalConflict = conflictId;
        this.ready = true;
        return true;
      }
      const remoteChanged = !baseline || header.version !== baseline.version || remoteHash !== baseline.remoteHash;
      const decision = conflictId && choice.choice === 'remote' ? 'pull' : decideSync({
        hasBaseline: !!baseline, remoteChanged,
        localChanged: !!baseline && localHash !== baseline.localHash, remoteExists: true
      });
      if (decision === 'pull') {
        if (remote.info.isBootstrap && !localInfo.isBootstrap) {
          throw new Error('远端是初始化数据，已保留本地数据并停止同步');
        }
        const imported = await this._pull(remote.version, remote.data);
        if (!imported) return;
        const importedData = await (await this.get_dbData()).text();
        await this.saveBaseline(remote.version, remote.dataEtag, await snapshotFingerprint(importedData), remoteHash);
      } else if (remote && baseline && !remoteChanged && !sameEtag(header.dataEtag, baseline.dataEtag)) {
        await this.saveBaseline(remote.version, remote.dataEtag, baseline.localHash, remoteHash);
      }
      this.remoteVersion = header.version;
      this.remoteData = remote?.data ?? null;
      this.remoteEtag = header.dataEtag;
      this.suppressUpdates = true;
      try {
        await this.rootStore.option.setItem('webdavDataEtag', header.dataEtag || '');
      } finally {
        this.suppressUpdates = false;
      }
      if (!this.rootStore.option.item.webdavExpectedRemote) {
        this.suppressUpdates = true;
        try {
          await this.rootStore.option.setItem('webdavExpectedRemote', true);
        } finally {
          this.suppressUpdates = false;
        }
      }
      this.ready = true;
      this.syncConflict = null;
      pushLocal = decision === 'push';
    } catch (error) {
      this.rootStore.tools.error(`同步拉取异常: ${error.message || '未知错误'}`);
    } finally {
      this.lock = false;
      this.waitType = '';
    }
    return pushLocal;
  }

  _pull = async (webdavVersion, data) => {

    const {
      option,
      link,
      note,
      tools
    } = this.rootStore;
    
    // 先备份当前数据，以防导入失败
    let backupBlob = null;
    let databaseMayBeChanged = false;
    try {
      backupBlob = await this.get_dbData();
      if (!backupBlob || backupBlob.size === 0) throw new Error('本地备份为空');
      const backupText = await backupBlob.text();
      const backupInfo = inspectSnapshot(backupText);
      // 初始化数据无需留存；真实数据先保存在独立的本地数据库，再替换主数据库。
      if (!backupInfo.isBootstrap) {
        await saveWebdavLocalBackup(backupBlob, await snapshotFingerprint(backupText));
      }
    } catch (error) {
      console.error('备份数据失败:', error);
      // 无法备份时不能删除现有数据库。
      throw error;
    }

    try {
      this.suppressUpdates = true;
      this.cache = {};
      localStorageKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(option.item, key)) {
          this.cache[key] = option.item[key];
        }
      });

      if (!data || data.trim() === '') {
        throw new Error('远端数据文件为空');
      }

      const blob = new Blob([data], {
        type: 'application/json'
      });

      // 解析 JSON 数据
      const text = await blob.text();
      if (!text || text.trim() === '') {
        throw new Error('远端数据内容为空');
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`远端数据格式错误: ${parseError.message}`);
      }

      // 验证数据完整性（兼容旧版本）
      if (!json || !json.data) {
        throw new Error('远端数据格式不完整：缺少 data 字段');
      }

      // 数据库名称验证（旧版本可能没有此字段，所以只验证存在时是否匹配）
      if (json.data.databaseName && json.data.databaseName !== 'jvmao-tab') {
        throw new Error(`数据库名称不匹配: 期望 jvmao-tab，实际 ${json.data.databaseName}`);
      }

      // 数据库版本验证（旧版本可能没有此字段，使用默认值）
      let databaseVersion = json.data.databaseVersion;
      if (!databaseVersion) {
        console.warn('远端数据缺少 databaseVersion 字段，使用默认版本 1.5（兼容旧版本）');
        databaseVersion = 1.5; // 使用默认版本，兼容旧版本数据
      }

      // 验证数据表是否存在且不为空（兼容旧版本可能没有 tables 字段的情况）
      // 注意：旧版本的数据格式可能不同，所以这里只做基本验证
      if (json.data.tables) {
        const tableKeys = Object.keys(json.data.tables);
        if (tableKeys.length === 0) {
          throw new Error('远端数据表为空，拒绝导入以避免数据丢失');
        }
        // 验证至少有一些基本表存在
        const requiredTables = ['option', 'link', 'note'];
        const hasRequiredTable = requiredTables.some(table => tableKeys.includes(table));
        if (!hasRequiredTable) {
          console.warn('远端数据缺少基本表，但继续导入（兼容旧版本）');
        }
      } else {
        // 旧版本可能没有 tables 字段，但数据可能在其他位置
        console.warn('远端数据缺少 tables 字段，尝试继续导入（兼容旧版本）');
        // 不抛出错误，让 db.import 来处理
      }

      const { remote: latestRemote } = await this.readVerifiedRemoteState();
      if (latestRemote.version !== webdavVersion || latestRemote.data !== data) {
        console.error('[WebDAV 同步][pull:changed-before-import]', {
          expectedVersion: webdavVersion,
          actualVersion: latestRemote.version,
          contentChanged: latestRemote.data !== data,
          expectedSize: new Blob([data]).size,
          actualSize: latestRemote.data === null ? null : new Blob([latestRemote.data]).size,
          checkedAt: new Date().toISOString()
        });
        throw new Error('远端在拉取过程中发生变化，请重新打开页面');
      }

      // 只有在验证通过后才删除数据库
      databaseMayBeChanged = true;
      await db.delete();

      if (!db.isOpen()) {
        await db.open();
      }

      // 导入数据
      await db.import(blob, {
        noTransaction: false,
        clearTables: true,
        acceptVersionDiff: true,
        progressCallback
      });

      // 验证导入后的实际记录数，不能只检查导出文件大小。
      const importedData = await this.get_dbData();
      if (!importedData || importedData.size === 0) {
        throw new Error('导入后数据验证失败：数据为空或大小为0');
      }
      const expected = inspectSnapshot(data);
      const actual = inspectSnapshot(await importedData.text());
      if (actual.links !== expected.links || actual.notes !== expected.notes) {
        throw new Error('导入后链接或便签数量不一致');
      }

      // 等待版本号及本地专用选项真正落盘，再从数据库刷新内存选项。
      const embeddedVersion = inspectSnapshot(data).embeddedVersion;
      await option.setItem('webdavVersion', Math.max(webdavVersion, embeddedVersion ?? webdavVersion));
      for (const key of localStorageKeys) {
        if (key !== 'webdavVersion' && Object.prototype.hasOwnProperty.call(this.cache, key)) {
          await option.setItem(key, this.cache[key]);
        }
      }
      await option.resetChromeSaveOption();
      await link.restart(true);
      note.init();
      if (db.verno !== databaseVersion) {
        db.__upgrade(db);
      }
      return true;

    } catch (error) {
      handleError(error, "DataStores._pull");
      if (!databaseMayBeChanged) {
        tools.error(`同步拉取失败，本地数据未改动: ${error.message}`);
        return false;
      }
      
      // 如果导入失败且有备份，尝试恢复
      if (backupBlob && backupBlob.size > 0) {
        try {
          console.log('尝试恢复备份数据...');
          // 确保数据库已关闭再删除
          if (db.isOpen()) {
            await db.close();
          }
          await db.delete();
          if (!db.isOpen()) {
            await db.open();
          }
          await db.import(backupBlob, {
            noTransaction: false,
            clearTables: true,
            acceptVersionDiff: true,
            progressCallback
          });
          
          // 验证恢复后的数据
          const restoredData = await this.get_dbData();
          if (!restoredData || restoredData.size === 0) {
            throw new Error('恢复后的数据验证失败：数据为空');
          }
          
          console.log('备份数据恢复成功');
          tools.error(`同步失败，已恢复本地数据: ${error.message}`);
        } catch (restoreError) {
          handleError(restoreError, "DataStores._pull.restoreBackup");
          // 恢复失败，数据库可能处于不一致状态
          // 尝试重新打开数据库
          try {
            if (!db.isOpen()) {
              await db.open();
            }
          } catch (openError) {
            handleError(openError, "DataStores._pull.reopenDb");
          }
          tools.error(`同步失败且无法恢复数据: ${error.message}。恢复备份失败: ${restoreError.message}。请手动重新加载页面。`);
        }
      } else {
        if (!backupBlob) {
          console.error('没有备份数据，无法恢复');
        } else {
          console.error('备份数据为空，无法恢复');
        }
        tools.error(`同步拉取失败: ${error.message}。无法恢复数据，请检查远端数据是否正常。`);
      }

      return false;
    } finally {
      this.suppressUpdates = false;
    }
  };

  toArrayBuffer(blob) {
    return blob.arrayBuffer();
  }

  push = async () => {
    return this.withProfileLock(() => this.pushLocked());
  }

  pushLocked = async () => {
    if (!this.ready || !this.client) return;
    if (this.lock) {
      if (this.waitType === 'push') this.dirtyDuringPush = true;
      return;
    }
    this.lock = true;
    this.waitType = 'push';
    const forceConflictId = this.forceLocalConflict;
    this.forceLocalConflict = null;
    try {
      // 锁住本页后重新读取两个文件；连接测试时读取的版本不能用于写入判断。
      const { remote } = await this.readVerifiedRemoteState();
      if (forceConflictId) {
        const currentHash = await fileFingerprint(remote.data);
        const currentId = `${remote.version}:${remote.embeddedVersion}:${currentHash}`;
        if (currentId !== forceConflictId) {
          throw new Error('远端数据已变化，请重新检查并选择');
        }
      }
      const blob = await this.get_dbData();
      const localData = await blob.text();
      const localInfo = inspectSnapshot(localData);
      const localHash = await snapshotFingerprint(localData);
      const baseline = await this.loadBaseline();
      if (baseline && localHash === baseline.localHash && !forceConflictId) return;
      if (!baseline && remote.data !== null && !forceConflictId) {
        throw new Error('没有本机同步基线，须先拉取远端数据');
      }
      if (!baseline && localInfo.isBootstrap) return;
      if (baseline && remote.data === null) {
        throw new Error('远端文件已消失，已停止上传');
      }
      const remoteHash = remote.data === null ? null : await fileFingerprint(remote.data);
      const remoteChanged = baseline &&
        (remote.version !== baseline.version || remoteHash !== baseline.remoteHash);
      const localBootstrapConflict = localInfo.isBootstrap && remote.info && !remote.info.isBootstrap;
      if (forceConflictId && localInfo.isBootstrap) {
        throw new Error('本地是初始化数据，不能覆盖远端数据');
      }
      if (localInfo.isBootstrap && !localBootstrapConflict) return;
      if (!forceConflictId && (remoteChanged || localBootstrapConflict)) {
        if (remote.data === null) throw new Error('远端文件已消失，已停止上传');
        if (remote.info.isBootstrap && !localInfo.isBootstrap) {
          throw new Error('远端变成初始化数据，已保留本地数据并停止同步');
        }
        this.waitType = 'pull';
        const imported = await this._pull(remote.version, remote.data);
        if (!imported) {
          this.ready = false;
          return;
        }
        this.remoteVersion = remote.version;
        this.remoteData = remote.data;
        this.remoteEtag = remote.dataEtag;
        const importedData = await (await this.get_dbData()).text();
        await this.saveBaseline(remote.version, remote.dataEtag, await snapshotFingerprint(importedData), remoteHash);
        this.suppressUpdates = true;
        try {
          await this.rootStore.option.setItem('webdavDataEtag', remote.dataEtag || '');
        } finally {
          this.suppressUpdates = false;
        }
        this.dirtyDuringPush = false;
        this.ready = true;
        return;
      }
      if (remote.data !== null && (!remote.dataEtag || !remote.versionEtag)) {
        throw new Error('服务器未提供文件 ETag，无法安全地条件写入现有远端数据');
      }
      if (remote.data !== null) {
        canReplaceRemote({
          expectedVersion: forceConflictId ? remote.version : baseline.version,
          actualVersion: remote.version,
          expectedData: remote.data,
          actualData: remote.data,
          expectedEtag: remote.dataEtag,
          actualEtag: remote.dataEtag,
          localInfo,
          remoteInfo: remote.info
        });
      }
      const nextVersion = Math.max(remote.version ?? 0, remote.embeddedVersion ?? 0) + 1;
      if (!Number.isSafeInteger(nextVersion)) throw new Error('WebDAV 版本号超出安全范围');

      // The user's local choice must leave a separate, durable remote copy.
      if (forceConflictId) {
        await this.writeFile(this.dir + `/jvmao-tab.conflict-${Date.now()}-v${remote.version}.json`,
          new Blob([remote.data], { type: 'application/json' }), { overwrite: false });
      }
      // 先保存远端上一版。备份写入失败时，绝不覆盖正式数据。
      if (remote.data !== null) {
        await this.writeFile(this.dir + '/jvmao-tab.previous.json',
          new Blob([remote.data], { type: 'application/json' }));
      }
      // 先在上传副本里写下一版本；远端确认成功前不提前改动本地版本。
      const nextData = withSnapshotVersion(localData, nextVersion);
      const nextBlob = new Blob([nextData], { type: 'application/json' });
      await this.writeFile(this.dir + devJsonName, nextBlob, {
        overwrite: remote.data !== null,
        headers: remote.dataEtag ? { 'If-Match': remote.dataEtag } : undefined
      });
      try {
        await this.writeFile(this.dir + devVName,
          new Blob([String(nextVersion)], { type: 'text/plain' }), {
            overwrite: remote.version !== null,
            headers: remote.versionEtag ? { 'If-Match': remote.versionEtag } : undefined
          });
      } catch (error) {
        if (remote.data !== null) {
          try {
            const latest = await this.readRemoteState();
            // 只在正式文件仍是自己刚写入的内容时尝试恢复上一版。
            if (latest.data === nextData) {
              await this.writeFile(this.dir + devJsonName,
                new Blob([remote.data], { type: 'application/json' }), {
                  headers: latest.dataEtag ? { 'If-Match': latest.dataEtag } : undefined
                });
            }
          } catch (restoreError) {
            console.error('远端旧数据恢复失败，仍保留 previous 备份:', restoreError);
          }
        }
        throw error;
      }
      this.remoteVersion = nextVersion;
      this.remoteData = nextData;
      const committed = await this.readRemoteHeader();
      if (committed.version !== nextVersion) throw new Error('上传后版本号核对失败');
      this.remoteEtag = committed.dataEtag;
      this.suppressUpdates = true;
      await this.rootStore.option.setItem('webdavVersion', nextVersion);
      await this.rootStore.option.setItem('webdavExpectedRemote', true);
      await this.saveBaseline(nextVersion, committed.dataEtag, await snapshotFingerprint(nextData), await fileFingerprint(nextData));
      await this.rootStore.option.setItem('webdavDataEtag', committed.dataEtag || '');
      this.syncConflict = null;
    } catch (error) {
      this.ready = false;
      this.rootStore.tools.error(`WebDAV 上传已停止: ${error.message || '未知错误'}`);
    } finally {
      this.suppressUpdates = false;
      this.lock = false;
      this.waitType = '';
      if (this.dirtyDuringPush && this.ready) {
        this.dirtyDuringPush = false;
        this._update();
      }
    }
  }

  deleteServeData = () => {
    const {
      option
    } = this.rootStore;

    this.pause();
    option.setItem('webDavURL', '');
    option.setItem('webDavUsername', '');
    option.setItem('webDavPassword', '');
    option.setItem('webDavDir', '');

  }

  _update = () => {}

  pause = () => {
    this._update.cancel?.();
    this.ready = false;
    this.client = null;
    this.connectionKey = '';
  }

  update = () => {
    if (this.suppressUpdates || !this.rootStore.option.item.webDavURL || !this.ready) return;
    if (this.lock) {
      if (this.waitType === 'push') this.dirtyDuringPush = true;
      return;
    }
    this._update();
  }

  get_dbData = () => {
    return new Promise((resolve, reject) => {
      try {
        db.export({
          prettyJson: true,
          progressCallback: () => {},
          // 不同步的表：
          // - cache: 本地缓存数据
          // - favicon: 本地按域名缓存的站点图标（体积大且可重新生成）
          skipTables: ['cache', 'favicon'],
          transform: (table, value, key) => {
            if (table === 'option') {
              switch (value.key) {
                case 'bgType':
                case 'bg2Type': {
                  let type_value = _.cloneDeep(value);
                  if (type_value.value === 'file') {
                    type_value.value = value.key == 'bgType' ? 'bing' : '';
                  }
                  return {
                    value: type_value,
                      key,
                  }
                }

                case 'bgBase64':
                case 'bg2Base64': {
                  let _value = _.cloneDeep(value);
                  _value.value = '';
                  return {
                    value: _value,
                      key,
                  }
                }

                case 'webdavDataEtag': {
                  const localOnlyValue = _.cloneDeep(value);
                  localOnlyValue.value = '';
                  return { value: localOnlyValue, key };
                }
              }
            }
            return {
              value,
              key,
            }
          }
        }).then((data) => {
          resolve(data);
        }).catch((error) => {
          reject(error);
        })
      } catch (error) {
        reject(error);
      }
    });
  }

  readFile = (filePath) => {
    return new Promise((resolve, reject) => {
      try {
        this.client.getFileContents(filePath, {
          format: "text"
        }).then((content) => {
          resolve(content);
        }).catch((error) => {
          reject(error);
        })
      } catch (error) {
        reject(error);
      }
    });

  };

  // 写入文件内容
  writeFile = async (filePath, blob, options = {}) => {
    const content = await this.toArrayBuffer(blob);
    const written = await this.client.putFileContents(filePath, content, { overwrite: true, ...options });
    if (written === false) throw new Error('远端文件已存在，条件写入失败');
    return written;
  };

  listDirectory = (path) => {
    return new Promise((resolve, reject) => {
      try {
        this.client.getDirectoryContents(path).then((data) => {
          resolve(data);
        }).catch((error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  };
}
