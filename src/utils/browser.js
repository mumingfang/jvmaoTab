// 统一浏览器 API 封装，优先使用 chrome（Firefox 也提供 chrome 别名），
// 如果没有 chrome 再回退到 browser。
// 这样可以保持现有基于回调的代码在 Chrome/Firefox 下都正常工作。

const getBrowserApi = () => {
  if (typeof globalThis !== "undefined") {
    if (globalThis.chrome) {
      return globalThis.chrome;
    }
    if (globalThis.browser) {
      return globalThis.browser;
    }
  }
  return null;
};

export const browserApi = getBrowserApi();

export const hasBrowserApi = !!browserApi;

// 统一获取 runtime.lastError，避免各处直接访问全局 chrome
export const getLastError = () => {
  if (browserApi && browserApi.runtime && browserApi.runtime.lastError) {
    return browserApi.runtime.lastError;
  }
  return null;
};


