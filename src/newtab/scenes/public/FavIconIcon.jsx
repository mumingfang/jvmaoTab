import React from "react";

const FavIconIcon = (props) => {
  const { url, size = 30, style = {}, onlyDomain = false } = props;

  // 基于url构造图标地址
  const getSrcToUrl = (u) => {
    try {
      if (!u) {
        u = window.location.href;
      }
      const _u = new URL(u);
      const url = new URL(window.chrome.runtime.getURL("/_favicon/"));
      url.searchParams.set("pageUrl", onlyDomain ? _u.origin : u);
      url.searchParams.set("size", size * 2);
      return url.toString();
    } catch (error) {
      console.log('%c [ error - u ]-9', 'font-size:13px; background:pink; color:#bf2c9f;', u)
      console.log('%c [ error ]-15', 'font-size:13px; background:pink; color:#bf2c9f;', error)
    }

    return '/';

  };

  return (
    <img src={getSrcToUrl(url)} alt="" style={{ width: size, height: size, ...style }} />
  );
};

export default FavIconIcon;
