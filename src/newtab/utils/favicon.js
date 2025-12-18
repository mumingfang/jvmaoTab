import { getFavicon, saveFavicon } from "~/db";
import { isSpecialProtocol } from "~/utils";

// 解析 sizes 字符串为数字（仅取宽度，如 "128x128" -> 128）
const parseSize = (sizes) => {
  if (!sizes) return null;
  const parts = sizes.split("x");
  const n = parseInt(parts[0], 10);
  return Number.isNaN(n) ? null : n;
};

// 根据候选列表选择最合适的 favicon（优先接近 targetSize，其次最大）
const chooseBestIcon = (items, targetSize = 128) => {
  if (!items || items.length === 0) return null;

  const withSize = items.filter((i) => typeof i.size === "number" && i.size > 0);
  if (withSize.length > 0) {
    // 先按与 targetSize 的差排序，再按 size 值倒序
    withSize.sort((a, b) => {
      const da = Math.abs(a.size - targetSize);
      const db = Math.abs(b.size - targetSize);
      if (da === db) {
        return b.size - a.size;
      }
      return da - db;
    });
    return withSize[0];
  }

  // 没有 size 的情况下，返回第一个
  return items[0];
};

// 预加载图片，拿到真实尺寸
const loadImageSize = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({
        url,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
};

// 基于 URL 直接抓取 favicon（不依赖当前活动 tab）
const detectFaviconFromUrl = async (url) => {
  if (!url || isSpecialProtocol(url)) {
    return null;
  }

  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }

  try {
    // 使用 fetch 获取页面 HTML
    // 注意：在扩展的 newtab 页面中，直接 fetch 可能遇到 CORS 问题
    // 如果失败，会 fallback 到 /favicon.ico
    console.log("[favicon] detectFaviconFromUrl: fetching", url);
    
    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          "User-Agent": navigator.userAgent,
        },
      });
    } catch (fetchError) {
      console.warn("[favicon] detectFaviconFromUrl: fetch failed (likely CORS)", fetchError);
      // CORS 失败时，直接尝试 /favicon.ico
      throw new Error("CORS_BLOCKED");
    }

    console.log("[favicon] detectFaviconFromUrl: response status", response.status, response.ok);
    if (!response.ok) {
      console.warn("[favicon] detectFaviconFromUrl: response not ok", response.status, response.statusText);
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // 获取所有可能的 favicon link 标签
    const links = Array.from(doc.getElementsByTagName("link"));
    const relRegex = /\b(icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)\b/i;
    const faviconLinks = links.filter((link) => relRegex.test(link.rel || ""));

    const candidates = [];

    // 来自 <link> 的候选
    faviconLinks.forEach((link) => {
      try {
        const href = link.getAttribute("href");
        if (!href) return;
        const absUrl = new URL(href, url).href;
        const size = parseSize(link.getAttribute("sizes"));
        candidates.push({ url: absUrl, size: size || null });
      } catch (e) {
        // ignore
      }
    });

    // 如果没有任何 <link rel="icon">，构造一个默认 /favicon.ico
    if (candidates.length === 0) {
      try {
        const fallback = new URL("/favicon.ico", url).href;
        candidates.push({ url: fallback, size: null });
      } catch (e) {
        return null;
      }
    }

    // 先尝试根据 link.sizes 选择，若没有尺寸信息，则用真实尺寸再挑一遍
    const withParsedSize = candidates.filter((c) => typeof c.size === "number");
    if (withParsedSize.length > 0) {
      const best = chooseBestIcon(withParsedSize);
      return {
        domain: origin,
        iconUrl: best.url,
        size: best.size || null,
      };
    }

    // 没有 sizes 信息，预加载实际尺寸（最多尝试前 3 个，避免太慢）
    const loaded = [];
    for (const c of candidates.slice(0, 3)) {
      try {
        const imgInfo = await loadImageSize(c.url);
        loaded.push({
          url: imgInfo.url,
          size: Math.max(imgInfo.width, imgInfo.height),
        });
      } catch {
        // 单个失败忽略，继续尝试其他
      }
    }

    if (loaded.length === 0) {
      // 如果都加载失败，至少返回第一个候选 URL
      return {
        domain: origin,
        iconUrl: candidates[0].url,
        size: null,
      };
    }

    const best = chooseBestIcon(loaded);
    if (!best) return null;

    return {
      domain: origin,
      iconUrl: best.url,
      size: best.size || null,
    };
  } catch (error) {
    console.warn("[favicon] detectFaviconFromUrl: error occurred", error);
    // fetch 失败或解析失败，尝试直接使用 /favicon.ico
    try {
      const fallback = new URL("/favicon.ico", url).href;
      console.log("[favicon] detectFaviconFromUrl: using fallback /favicon.ico", fallback);
      return {
        domain: origin,
        iconUrl: fallback,
        size: null,
      };
    } catch (e) {
      console.error("[favicon] detectFaviconFromUrl: fallback also failed", e);
      return null;
    }
  }
};

// 确保给定 URL 的域名在 favicon 表中有记录：仅在抽屉真正保存链接时调用
export const ensureFaviconForUrl = async (url) => {
  if (!url) {
    console.log("[favicon] ensureFaviconForUrl: url is empty");
    return;
  }

  let origin;
  try {
    origin = new URL(url).origin;
    console.log("[favicon] ensureFaviconForUrl: processing", url, "origin:", origin);
  } catch (e) {
    console.error("[favicon] ensureFaviconForUrl: invalid URL", url, e);
    return;
  }

  // 先查表，已有记录则不做任何事
  try {
    const exist = await getFavicon(origin);
    if (exist && exist.iconUrl) {
      console.log("[favicon] ensureFaviconForUrl: already exists in DB", origin);
      return;
    }
    console.log("[favicon] ensureFaviconForUrl: not found in DB, will fetch", origin);
  } catch (e) {
    console.error("[favicon] ensureFaviconForUrl: error checking DB", e);
  }

  // 基于 URL 直接抓取 favicon
  let data;
  try {
    data = await detectFaviconFromUrl(url);
    console.log("[favicon] ensureFaviconForUrl: detectFaviconFromUrl result", data);
  } catch (e) {
    console.error("[favicon] ensureFaviconForUrl: detectFaviconFromUrl failed", e);
    data = null;
  }

  if (!data || !data.iconUrl) {
    console.warn("[favicon] ensureFaviconForUrl: no favicon data found for", url);
    return;
  }

  // 确保域名一致再写入
  if (data.domain && data.domain === origin) {
    try {
      await saveFavicon({
        domain: origin,
        iconUrl: data.iconUrl,
        size: data.size || null,
      });
      console.log("[favicon] ensureFaviconForUrl: saved to DB", origin, data.iconUrl);
    } catch (e) {
      console.error("[favicon] ensureFaviconForUrl: failed to save to DB", e);
    }
  } else {
    console.warn("[favicon] ensureFaviconForUrl: domain mismatch", data.domain, "vs", origin);
  }
};


