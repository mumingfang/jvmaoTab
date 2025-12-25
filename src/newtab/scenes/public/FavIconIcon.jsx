import React from "react";
import { getFavicon } from "~/db";
import { isSpecialProtocol } from "~/utils";
import useStores from "~/hooks/useStores";

// 检测是否是 Firefox（优先使用 userAgent）
const isFirefox = () => {
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    return navigator.userAgent.toLowerCase().includes("firefox");
  }
  return false;
};

// 获取默认网络图标路径（统一的默认图标，用于没有 favicon 记录的情况）
const getDefaultFaviconSrc = () => {
  try {
    // Firefox 优先使用 browser API
    if (isFirefox() && browser.runtime && browser.runtime.getURL) {
      return browser.runtime.getURL("default-favicon.svg");
    }
    // Chrome 使用 chrome API
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL("default-favicon.svg");
    }
  } catch {
    // ignore
  }
  // 兜底：返回相对路径（如果扩展路径获取失败）
  return "/default-favicon.svg";
};

// 回退逻辑：在本地表未命中时，Chrome 走 /_favicon/ 逻辑，Firefox 使用默认图标
const getFallbackSrc = (rawUrl, size, onlyDomain, isDarkMode = false) => {
  // 如果 URL 为空，直接返回默认图标
  if (!rawUrl) {
    return getDefaultFaviconSrc();
  }

  // Chrome 浏览器：尝试使用 /_favicon/ API（Firefox 不支持此 API）
  if (!isFirefox() && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
    try {
      // Chrome 下尝试使用 /_favicon/ 接口（包括特殊协议如 chrome://history）
      // 即使 URL 是特殊协议，也尝试使用 /_favicon/ API，Chrome 可以处理
      const pageUrl = new URL(rawUrl);
      const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
      faviconUrl.searchParams.set("pageUrl", onlyDomain ? pageUrl.origin : rawUrl);
      faviconUrl.searchParams.set("size", size * 2);
      // 如果是暗黑模式，添加 darkScheme 参数以获取暗黑模式的图标
      if (isDarkMode) {
        faviconUrl.searchParams.set("darkScheme", "true");
      }
      return faviconUrl.toString();
    } catch (error) {
      // 解析失败时回退到默认图标（比如 URL 格式错误）
      return getDefaultFaviconSrc();
    }
  }

  // Firefox 或其他浏览器：使用默认网络图标
  return getDefaultFaviconSrc();
};

const FavIconIcon = (props) => {
  const { url, size = 30, style = {}, onlyDomain = false } = props;
  
  // 获取 option store 以检测暗黑模式（hooks 必须在组件顶层调用）
  const stores = useStores();
  
  // 检测是否为暗黑模式
  // 读取 systemTheme 以确保 MobX 能够追踪变化（如果组件被 observer 包装）
  const systemTheme = stores?.option?.item?.systemTheme;
  const isDarkMode = React.useMemo(() => {
    if (stores && stores.option && typeof stores.option.getSystemTheme === 'function') {
      return stores.option.getSystemTheme() === 'dark';
    }
    // 如果无法获取 store，使用 matchMedia 作为兜底
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [stores, systemTheme]);

  const [src, setSrc] = React.useState(() => getFallbackSrc(url, size, onlyDomain, isDarkMode));
  // 跟踪当前 src 的来源：'db' 表示来自数据库，'fallback' 表示已经是回退逻辑，'default' 表示默认图标
  const [srcType, setSrcType] = React.useState('fallback');

  // 监听全局 favicon 刷新事件
  React.useEffect(() => {
    const handleFaviconRefresh = (event) => {
      const refreshedOrigin = event.detail?.origin;
      if (!url || !refreshedOrigin) return;
      
      try {
        const currentOrigin = new URL(url).origin;
        // 如果刷新的是当前 URL 的域名，重新加载图标
        if (currentOrigin === refreshedOrigin) {
          // 通过设置一个临时 key 来触发重新加载
          // 实际上，我们直接重新读取数据库即可
          setTimeout(() => {
            const loadFromDb = async () => {
              try {
                const record = await getFavicon(currentOrigin);
                if (record) {
                  if (isDarkMode && record.iconUrlDark) {
                    setSrc(record.iconUrlDark);
                    setSrcType('db');
                  } else if (record.iconUrl) {
                    setSrc(record.iconUrl);
                    setSrcType('db');
                  }
                }
              } catch (e) {
                // ignore
              }
            };
            loadFromDb();
          }, 100); // 稍等一下确保数据库已更新
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('faviconRefreshed', handleFaviconRefresh);
    return () => {
      window.removeEventListener('faviconRefreshed', handleFaviconRefresh);
    };
  }, [url, isDarkMode]);

  React.useEffect(() => {
    let cancelled = false;

    const loadFromDb = async () => {
      // 如果没有 URL，直接使用回退逻辑（Chrome 的 /_favicon/ 需要有效 URL）
      if (!url) {
        setSrc(getDefaultFaviconSrc());
        setSrcType('default');
        return;
      }

      let origin;
      try {
        const u = new URL(url);
        // 数据库中按域名（origin）存储，所以始终使用 origin
        origin = u.origin;
      } catch (urlError) {
        // URL 解析失败（可能是特殊协议或其他格式错误）
        // 在 Chrome 中，即使解析失败也尝试使用 /_favicon/ API
        setSrc(getFallbackSrc(url, size, onlyDomain, isDarkMode));
        setSrcType('fallback');
        return;
      }

      try {
        // 先判断什么模式：优先从 options 表读取设置
        let isDarkModeNow = false;
        if (stores && stores.option && typeof stores.option.getSystemTheme === 'function') {
          isDarkModeNow = stores.option.getSystemTheme() === 'dark';
        } else {
          // 兜底：使用外部的 isDarkMode
          isDarkModeNow = isDarkMode;
        }

        // 读取数据库中的图标
        const record = await getFavicon(origin);
        if (cancelled) return;

        if (isDarkModeNow) {
          // 暗黑模式
          if (record && record.iconUrlDark) {
            // 有暗黑模式图标，直接使用
            setSrc(record.iconUrlDark);
            setSrcType('db');
          } else {
            // 没有暗黑模式图标，判断浏览器
            if (!isFirefox() && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
              // Chrome：使用 API
              setSrc(getFallbackSrc(url, size, onlyDomain, true));
              setSrcType('fallback');
            } else {
              // 非 Chrome：使用表里的正常图标，如果没有则返回默认图标
              if (record && record.iconUrl) {
                setSrc(record.iconUrl);
                setSrcType('db');
              } else {
                setSrc(getDefaultFaviconSrc());
                setSrcType('default');
              }
            }
          }
        } else {
          // 正常模式
          if (record && record.iconUrl) {
            // 有正常模式图标，直接使用
            setSrc(record.iconUrl);
            setSrcType('db');
          } else {
            // 没有正常模式图标，判断浏览器
            if (!isFirefox() && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
              // Chrome：使用 API
              setSrc(getFallbackSrc(url, size, onlyDomain, false));
              setSrcType('fallback');
            } else {
              // 非 Chrome：使用默认图标
              setSrc(getDefaultFaviconSrc());
              setSrcType('default');
            }
          }
        }
      } catch {
        if (!cancelled) {
          setSrc(getFallbackSrc(url, size, onlyDomain, isDarkMode));
          setSrcType('fallback');
        }
      }
    };

    loadFromDb();

    return () => {
      cancelled = true;
    };
  }, [url, size, onlyDomain, isDarkMode, stores]);

  // 处理图片加载失败
  const handleImageError = React.useCallback(() => {
    // 如果当前 src 是数据库中的图标（不是 chrome-extension:// 或 default-favicon），且还没有尝试过 fallback
    if (srcType === 'db' && src && !src.startsWith('chrome-extension://') && !src.includes('default-favicon')) {
      // Chrome 浏览器：尝试使用 /_favicon/ API
      if (!isFirefox() && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        const fallbackSrc = getFallbackSrc(url, size, onlyDomain, isDarkMode);
        setSrc(fallbackSrc);
        setSrcType('fallback');
      } else {
        // 非 Chrome：使用默认图标
        setSrc(getDefaultFaviconSrc());
        setSrcType('default');
      }
    } else if (srcType === 'fallback' && src && src.startsWith('chrome-extension://')) {
      // 如果 Chrome API 也失败了，使用默认图标
      setSrc(getDefaultFaviconSrc());
      setSrcType('default');
    }
    // 如果已经是默认图标，就不再处理（避免无限循环）
  }, [src, srcType, url, size, onlyDomain, isDarkMode]);

  return (
    <img 
      src={src} 
      alt="" 
      style={{ width: size, height: size, ...style }} 
      onError={handleImageError}
      loading="lazy"
    />
  );
};

export default FavIconIcon;
