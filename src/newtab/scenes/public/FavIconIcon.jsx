import React from "react";
import { getFavicon } from "~/db";
import { isSpecialProtocol } from "~/utils";

// 获取默认网络图标路径（统一的默认图标，用于没有 favicon 记录的情况）
const getDefaultFaviconSrc = () => {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL("default-favicon.svg");
    }
    if (typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) {
      return browser.runtime.getURL("default-favicon.svg");
    }
  } catch {
    // ignore
  }
  // 兜底：返回相对路径（如果扩展路径获取失败）
  return "/default-favicon.svg";
};

// 回退逻辑：在本地表未命中时，Chrome 走 /_favicon/ 逻辑，其他浏览器使用默认图标
const getFallbackSrc = (rawUrl, size, onlyDomain) => {
  // Chrome 浏览器：尝试使用 /_favicon/ API
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
    try {
      if (!rawUrl) {
        rawUrl = window.location.href;
      }

      // 特殊协议统一使用默认图标
      if (isSpecialProtocol(rawUrl)) {
        return getDefaultFaviconSrc();
      }

      // Chrome 下使用 /_favicon/ 接口
      const pageUrl = new URL(rawUrl);
      const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
      faviconUrl.searchParams.set("pageUrl", onlyDomain ? pageUrl.origin : rawUrl);
      faviconUrl.searchParams.set("size", size * 2);
      return faviconUrl.toString();
    } catch (error) {
      // 解析失败时回退到默认图标
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
      if (!url) {
        setSrc(getFallbackSrc(url, size, onlyDomain));
        return;
      }

      let origin;
      try {
        const u = new URL(url);
        origin = onlyDomain ? u.origin : u.origin;
      } catch {
        setSrc(getFallbackSrc(url, size, onlyDomain));
        return;
      }

      try {
        const record = await getFavicon(origin);
        if (cancelled) return;

        if (record && record.iconUrl) {
          setSrc(record.iconUrl);
        } else {
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
