import React from "react";
import So from "./so";
import Note from "./note";
import SpecialSearch from "./specialSearch";
import { detectFaviconForCurrentPage } from "./faviconDetector";

const App = () => {
  // 页面加载时自动检测并发送 favicon（仅在用户真正访问页面时触发）
  React.useEffect(() => {
    // 延迟一下，确保页面 DOM 完全加载
    const timer = setTimeout(() => {
      detectFaviconForCurrentPage()
        .then((data) => {
          if (data && data.domain && data.iconUrl) {
            // 发送给 background，由 background 转发给 newtab 保存
            const runtime = typeof chrome !== "undefined" ? chrome.runtime : (typeof browser !== "undefined" ? browser.runtime : null);
            if (runtime) {
              runtime.sendMessage({
                type: "PAGE_FAVICON_DETECTED",
                data: {
                  domain: data.domain,
                  iconUrl: data.iconUrl,
                  size: data.size || null,
                },
              }).catch((err) => {
                // 静默失败，不影响页面
                console.debug("[favicon] Failed to send favicon to background", err);
              });
            }
          }
        })
        .catch((err) => {
          // 静默失败
          console.debug("[favicon] Failed to detect favicon", err);
        });
    }, 1000); // 延迟 1 秒，确保页面稳定

    return () => {
      clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    const messageListener = function (request, sender, sendResponse) {
      try {
        switch (request.type) {
          case "onTextMenuCS": {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              try {
                const range = selection.getRangeAt(0);
                const container = document.createElement("div");
                container.appendChild(range.cloneContents());
                sendResponse({ html: container.innerHTML }); // 这是HTML字符串
              } catch (error) {
                console.error("Error processing selection:", error);
                sendResponse({ html: "" });
              }
            } else {
              sendResponse({ html: "" });
            }
            break;
          }
          case "DETECT_FAVICON_FOR_CURRENT_PAGE": {
            // 仅检测并返回 favicon，不直接写入 IndexedDB
            detectFaviconForCurrentPage()
              .then((data) => {
                if (data && data.iconUrl) {
                  sendResponse({ ok: true, data });
                } else {
                  sendResponse({ ok: false });
                }
              })
              .catch(() => {
                sendResponse({ ok: false });
              });
            // 异步响应
            return true;
          }
          default:
            // 对于其他类型的消息，不返回 true，让系统知道这是同步响应
            return false;
        }
        // 返回 true 表示异步响应（虽然这里是同步的，但保持原有行为）
        return true;
      } catch (error) {
        console.error("Error in message listener:", error);
        sendResponse({ html: "" });
        return true;
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, []);

  return (
    <>
      <Note />
      <So />
      <SpecialSearch />
    </>
  );
};

export default App;