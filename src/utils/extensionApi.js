// 统一的浏览器扩展 API 封装，兼容 Chrome / Firefox
// 在大多数现代浏览器扩展环境中，Firefox 提供 browser.*，Chrome 提供 chrome.*
// Firefox 也提供 chrome 作为别名，但我们仍然优先使用 browser 以符合规范。

const globalObj =
  (typeof globalThis !== "undefined" && globalThis) ||
  (typeof window !== "undefined" && window) ||
  {};

const raw =
  globalObj.browser ||
  globalObj.chrome ||
  null;

// 简单的辅助：将回调风格的 API 包装为 Promise
function promisify(fn, context) {
  if (!fn) {
    return () =>
      Promise.reject(new Error("Extension API is not available in this environment"));
  }
  return (...args) =>
    new Promise((resolve, reject) => {
      try {
        fn.call(context, ...args, (result) => {
          const runtime = raw && raw.runtime;
          const lastError = runtime && runtime.lastError;
          if (lastError) {
            reject(lastError);
          } else {
            resolve(result);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
}

const extensionApi = {
  // 直接暴露原始对象，方便按需调用
  raw,

  get runtime() {
    return raw && raw.runtime;
  },

  get tabs() {
    return raw && raw.tabs;
  },

  get windows() {
    return raw && raw.windows;
  },

  get storage() {
    return raw && raw.storage;
  },

  get contextMenus() {
    return raw && raw.contextMenus;
  },

  // 常用 Promise 封装（按需使用）
  tabsQuery: promisify(raw && raw.tabs && raw.tabs.query, raw && raw.tabs),
  tabsCreate: promisify(raw && raw.tabs && raw.tabs.create, raw && raw.tabs),
  tabsUpdate: promisify(raw && raw.tabs && raw.tabs.update, raw && raw.tabs),
  tabsRemove: promisify(raw && raw.tabs && raw.tabs.remove, raw && raw.tabs),

  storageSyncGet: promisify(
    raw && raw.storage && raw.storage.sync && raw.storage.sync.get,
    raw && raw.storage && raw.storage.sync
  ),
  storageSyncSet: promisify(
    raw && raw.storage && raw.storage.sync && raw.storage.sync.set,
    raw && raw.storage && raw.storage.sync
  ),
  storageLocalGet: promisify(
    raw && raw.storage && raw.storage.local && raw.storage.local.get,
    raw && raw.storage && raw.storage.local
  ),
  storageLocalSet: promisify(
    raw && raw.storage && raw.storage.local && raw.storage.local.set,
    raw && raw.storage && raw.storage.local
  ),
  storageLocalRemove: promisify(
    raw && raw.storage && raw.storage.local && raw.storage.local.remove,
    raw && raw.storage && raw.storage.local
  ),

  // 获取扩展内资源 URL
  getURL(path) {
    if (raw && raw.runtime && typeof raw.runtime.getURL === "function") {
      try {
        return raw.runtime.getURL(path);
      } catch (e) {
        return path;
      }
    }
    return path;
  },
};

export default extensionApi;




