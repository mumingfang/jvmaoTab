export const parseVersion = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) {
    throw new Error('WebDAV 版本号无效');
  }
  const version = Number(text);
  if (!Number.isSafeInteger(version)) {
    throw new Error('WebDAV 版本号超出安全范围');
  }
  return version;
};

export const inspectSnapshot = (text) => {
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw new Error('WebDAV 数据文件不是有效的 JSON');
  }
  if (snapshot?.data?.databaseName !== 'jvmao-tab' || !Array.isArray(snapshot.data.data)) {
    throw new Error('WebDAV 数据文件格式不正确');
  }
  const tables = new Map(snapshot.data.data.map((entry) => [entry.tableName, entry.rows]));
  for (const name of ['option', 'link', 'note']) {
    if (!Array.isArray(tables.get(name))) {
      throw new Error(`WebDAV 数据文件缺少 ${name} 表`);
    }
  }
  if (tables.get('option').length === 0) {
    throw new Error('WebDAV 数据文件的选项表为空');
  }
  const links = tables.get('link');
  const notes = tables.get('note');
  const defaultTitles = [
    '左抽屉', '右抽屉', '暗格', '分组（右击标题可以添加至首屏）',
    '摸鱼爱好者导航', '点击可进行访问', '右击可以删除'
  ];
  const isBootstrap = links.length === defaultTitles.length &&
    defaultTitles.every((title) => links.some((link) => link.title === title)) &&
    notes.length === 1 && String(notes[0].content || '').includes('欢迎使用便签');
  const versionRow = tables.get('option').find((row) => row.key === 'webdavVersion');
  const embeddedVersion = versionRow ? parseVersion(versionRow.value) : null;
  return { snapshot, links: links.length, notes: notes.length, isBootstrap, embeddedVersion };
};

export const canReplaceRemote = ({ expectedVersion, actualVersion, expectedData, actualData, expectedEtag, actualEtag, localInfo, remoteInfo }) => {
  const contentChanged = expectedData === null
    ? !sameEtag(expectedEtag, actualEtag)
    : actualData !== expectedData;
  if (actualVersion !== expectedVersion || contentChanged) {
    throw new Error('远端数据已变化，已停止上传以防覆盖');
  }
  if (localInfo.isBootstrap && remoteInfo && !remoteInfo.isBootstrap) {
    throw new Error('本地是初始化数据，已阻止覆盖远端数据');
  }
};

const comparableSnapshot = (text) => {
  const snapshot = inspectSnapshot(text).snapshot;
  const ignoredOptions = new Set([
    'webdavVersion', 'webdavOpen', 'webdavExpectedRemote', 'webdavDataEtag', 'webDavURL', 'webDavUsername', 'webDavPassword',
    'webDavDir', 'bgType', 'bg2Type', 'bgBase64', 'bg2Base64'
  ]);
  const tables = Object.fromEntries(snapshot.data.data.map((entry) => [entry.tableName, entry.rows]));
  const options = Object.fromEntries(tables.option
    .filter((row) => !ignoredOptions.has(row.key))
    .map((row) => [row.key, row.value]));
  return JSON.stringify({
    links: tables.link,
    notes: tables.note,
    options: Object.fromEntries(Object.keys(options).sort().map((key) => [key, options[key]]))
  });
};

export const sameSnapshotContent = (leftText, rightText) =>
  comparableSnapshot(leftText) === comparableSnapshot(rightText);

const hashText = async (text) => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const snapshotFingerprint = (text) => hashText(comparableSnapshot(text));
export const fileFingerprint = (text) => hashText(text);

export const withSnapshotVersion = (text, version) => {
  const { snapshot } = inspectSnapshot(text);
  const options = snapshot.data.data.find((table) => table.tableName === 'option').rows;
  const versionRow = options.find((row) => row.key === 'webdavVersion');
  if (!versionRow) throw new Error('本地数据缺少 WebDAV 版本号，已停止上传');
  versionRow.value = version;
  const expectedRemote = options.find((row) => row.key === 'webdavExpectedRemote');
  if (expectedRemote) expectedRemote.value = true;
  return JSON.stringify(snapshot);
};

export const decideSync = ({ hasBaseline, remoteChanged, localChanged, remoteExists }) => {
  if (!remoteExists) return hasBaseline ? 'stop' : 'empty';
  if (!hasBaseline) return 'pull';
  if (remoteChanged) return 'pull';
  return localChanged ? 'push' : 'skip';
};

export const shouldUseRemote = ({ remoteVersion, localVersion, remoteData, localData }) =>
  remoteVersion !== localVersion || !sameSnapshotContent(remoteData, localData);

const isMissing = (error) => error.status === 404 || error.statusCode === 404 || /\b404\b/.test(error.message || '');
const noCacheHeaders = { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' };
// webdav.stat() removes quotes; GET returns the server's raw ETag header.
// Compare their opaque values, but use the raw GET value for If-Match writes.
export const sameEtag = (left, right) => {
  if (!left || !right) return false;
  const normalize = (value) => {
    const text = String(value).trim();
    const weak = text.startsWith('W/');
    const opaque = weak ? text.slice(2) : text;
    return `${weak ? 'W/' : ''}${opaque.replace(/^"|"$/g, '')}`;
  };
  return normalize(left) === normalize(right);
};

export const readRemoteHeader = async (client, dir) => {
  let versionFile = null;
  let dataStat = null;
  try {
    const result = await client.getFileContents(dir + '/jvmao-version.txt', {
      format: 'text', details: true, headers: noCacheHeaders
    });
    versionFile = typeof result === 'string'
      ? { data: result, headers: {} }
      : result;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  try {
    dataStat = await client.stat(dir + '/jvmao-tab.json', { headers: noCacheHeaders });
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  if ((versionFile === null) !== (dataStat === null)) {
    throw new Error('WebDAV 数据文件和版本文件不完整，已停止同步');
  }
  if (versionFile === null) {
    return { version: null, versionEtag: null, dataEtag: null, dataSize: null };
  }
  return {
    version: parseVersion(versionFile.data),
    versionEtag: versionFile.headers?.etag || versionFile.headers?.ETag || null,
    dataEtag: dataStat.etag || null,
    rawDataEtag: dataStat.etag || null,
    dataSize: dataStat.size
  };
};

export const readRemoteState = async (client, dir) => {
  const read = async (name) => {
    try {
      const result = await client.getFileContents(dir + name, {
        format: 'text', details: true, headers: noCacheHeaders
      });
      if (typeof result === 'string') return { data: result, etag: null };
      return { data: result.data, etag: result.headers?.etag || result.headers?.ETag || null };
    } catch (error) {
      if (isMissing(error)) {
        return null;
      }
      throw error;
    }
  };
  const versionFile = await read('/jvmao-version.txt');
  const dataFile = await read('/jvmao-tab.json');
  if ((versionFile === null) !== (dataFile === null)) {
    throw new Error('WebDAV 数据文件和版本文件不完整，已停止同步');
  }
  if (versionFile === null) return {
    version: null, data: null, info: null, embeddedVersion: null,
    dataEtag: null, versionEtag: null
  };
  const info = inspectSnapshot(dataFile.data);
  return {
    version: parseVersion(versionFile.data),
    data: dataFile.data,
    info,
    embeddedVersion: info.embeddedVersion,
    dataEtag: dataFile.etag,
    versionEtag: versionFile.etag
  };
};
