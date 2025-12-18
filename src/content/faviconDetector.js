// 内容脚本侧：检测当前页面 favicon，仅返回结果，不写入 IndexedDB

// 获取所有可能的 favicon link 标签
const getFaviconLinks = () => {
  const links = Array.from(document.getElementsByTagName("link"));
  const relRegex = /\b(icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)\b/i;
  return links.filter((link) => relRegex.test(link.rel || ""));
};

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

export const detectFaviconForCurrentPage = async () => {
  let origin;
  try {
    origin = new URL(window.location.href).origin;
  } catch (e) {
    return null;
  }

  const links = getFaviconLinks();
  const candidates = [];

  // 来自 <link> 的候选
  links.forEach((link) => {
    try {
      const href = link.getAttribute("href");
      if (!href) return;
      const absUrl = new URL(href, window.location.href).href;
      const size = parseSize(link.getAttribute("sizes"));
      candidates.push({ url: absUrl, size: size || null });
    } catch (e) {
      // ignore
    }
  });

  // 如果没有任何 <link rel="icon">，构造一个默认 /favicon.ico
  if (candidates.length === 0) {
    try {
      const fallback = new URL("/favicon.ico", window.location.href).href;
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

  // 没有 sizes 信息，预加载实际尺寸
  const loaded = [];
  for (const c of candidates) {
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
    return null;
  }

  const best = chooseBestIcon(loaded);
  if (!best) return null;

  return {
    domain: origin,
    iconUrl: best.url,
    size: best.size || null,
  };
};


