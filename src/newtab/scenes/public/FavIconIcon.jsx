import React from "react";
import { getFavicon } from "~/db";
import { isSpecialProtocol } from "~/utils";

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
const getFallbackSrc = (rawUrl, size, onlyDomain) => {
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
  const [src, setSrc] = React.useState(() => getFallbackSrc(url, size, onlyDomain));

  React.useEffect(() => {
    let cancelled = false;

    const loadFromDb = async () => {
      // 如果没有 URL，直接使用回退逻辑（Chrome 的 /_favicon/ 需要有效 URL）
      if (!url) {
        setSrc(getDefaultFaviconSrc());
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
        setSrc(getFallbackSrc(url, size, onlyDomain));
        return;
      }

      try {
        const record = await getFavicon(origin);
        if (cancelled) return;

        if (record && record.iconUrl) {
          setSrc(record.iconUrl);
        } else {
          // 数据库中没有记录，使用回退逻辑（Chrome 会尝试 /_favicon/ API）
          setSrc(getFallbackSrc(url, size, onlyDomain));
        }
      } catch {
        if (!cancelled) {
          setSrc(getFallbackSrc(url, size, onlyDomain));
        }
      }
    };

    loadFromDb();

    return () => {
      cancelled = true;
    };
  }, [url, size, onlyDomain]);

  return (
    <img src={src} alt="" style={{ width: size, height: size, ...style }} />
  );
};

export default FavIconIcon;
