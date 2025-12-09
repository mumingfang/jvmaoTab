import React from "react";

// 检测是否为特殊协议
const isSpecialProtocol = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const specialProtocols = /^(chrome|edge|about|moz-extension|chrome-extension):/i;
  return specialProtocols.test(url.trim());
};

const FavIconIcon = (props) => {
  const { url, size = 30, style = {}, onlyDomain = false } = props;

  // 基于url构造图标地址
  const getSrcToUrl = (u) => {
    try {
      if (!u) {
        u = window.location.href;
      }

      // 如果是特殊协议，返回默认图标路径
      if (isSpecialProtocol(u)) {
        // 返回一个默认图标或使用chrome扩展的图标
        try {
          const iconUrl = new URL(window.chrome.runtime.getURL("/_favicon/"));
          iconUrl.searchParams.set("pageUrl", u);
          iconUrl.searchParams.set("size", size * 2);
          return iconUrl.toString();
        } catch (e) {
          // 如果还是失败，返回默认路径
          return '/';
        }
      }

      const _u = new URL(u);
      const url = new URL(window.chrome.runtime.getURL("/_favicon/"));
      url.searchParams.set("pageUrl", onlyDomain ? _u.origin : u);
      url.searchParams.set("size", size * 2);
      return url.toString();
    } catch (error) {
      // 静默处理错误，不输出到控制台
      // 特殊协议URL可能无法用new URL()解析，这是正常的
      if (!isSpecialProtocol(u)) {
        console.log('%c [ error - u ]-9', 'font-size:13px; background:pink; color:#bf2c9f;', u)
        console.log('%c [ error ]-15', 'font-size:13px; background:pink; color:#bf2c9f;', error)
      }
    }

    return '/';

  };

  return (
    <img src={getSrcToUrl(url)} alt="" style={{ width: size, height: size, ...style }} />
  );
};

export default FavIconIcon;
