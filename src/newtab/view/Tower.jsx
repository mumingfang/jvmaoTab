import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { message, ConfigProvider, theme } from "antd";
import useStores from "~/hooks/useStores";
import { useDocumentVisibility } from 'ahooks';
import PublicModal from "~/scenes/Public/PublicModal";
import styled, { createGlobalStyle } from "styled-components";
import { IconCloudUpload, IconCloudDownload } from "@tabler/icons-react";
import { saveFavicon } from "~/db";
import { db } from "~/db";
import _ from "lodash";

const { useToken } = theme;

const Wrap = createGlobalStyle`
 body {
  --maxWidth: 1500px;
  --bgColor: ${(props) => props.color.bgColor};
  --fff: ${(props) => props.color.fff};
  --borderColor: ${(props) => props.color.borderColor};
  --colorText: ${(props) => props.color.colorText};
  --PrimaryColor: #1890ff;
  --sn-font-hei: -apple-system, "Noto Sans", "Helvetica Neue", Helvetica,
    "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB",
    "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN",
    "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti",
    SimHei, "WenQuanYi Zen Hei Sharp", sans-serif;
  --searcBoxShadowStickled: ${(props) => props.color.searcBoxShadowStickled};
  --searcBoxShadow: ${(props) => props.color.searcBoxShadow};
  --homeImgOpacity: ${(props) => props.color.homeImgOpacity};
  --homeLogoOpacity: ${(props) => props.color.homeLogoOpacity};
  --homeNavBg: ${(props) => props.color.homeNavBg};
  --homeNavBorderColor: ${(props) => props.color.homeNavBorderColor};
  --linkitemGhostBg: ${(props) => props.color.linkitemGhostBg};
  --notebrColor: ${(props) => props.color.notebrColor};
  --notebrBoxShadow: ${(props) => props.color.notebrBoxShadow};
  --notebrHomeHeaderBg: ${(props) => props.color.notebrHomeHeaderBg};
  background-color: var(--bgColor);
  }
`;

const CloudWrap = styled.div`
  position: fixed;
  right: 20px;
  bottom: 10px;
  color: var(--colorText);
  z-index: 999;
  animation: jv-blink 2s step-start 0s infinite;
`;

const RightClick = React.lazy(() => import("~/components/RightClick"));
const Preferences = React.lazy(() => import("~/scenes/preferences"));
// const FloatButton = React.lazy(() => import("~/components/FloatButton"));
const Tower = ({ children }) => {
  const { link, tools, note, option, data } = useStores();
  const [messageApi, contextHolder] = message.useMessage();
  const { systemTheme, tabTitle, homeImgOpacity = 0.2 } = option.item;
  const { token } = useToken();

  const v = React.useRef({
    isInit: false
  }).current;

  const documentVisibility = useDocumentVisibility();

  const getTheme = useCallback(() => {
    let isDark = option.getSystemTheme() === 'dark';;

    const t = {
      cssVar: true,
      token: {
        colorPrimary: '#e06400',
      },
    }
    if (isDark) {
      t.algorithm = theme.darkAlgorithm;
    }
    return t;
  }, [systemTheme]);

  const getMyTheme = useCallback(() => {
    let isDark = option.getSystemTheme() === 'dark';
    const t = {
      isDark,
    }
    if (isDark) {
      t.bgColor = '#1a1a1a';
      t.fff = '#1f1f1f';
      t.borderColor = 'rgba(253, 253, 253, 0.12)';
      t.colorText = 'rgba(255, 255, 255, 0.65)';
      t.searcBoxShadowStickled = "rgb(235 235 235) 0px 0px 2px -1px"
      t.searcBoxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)"
      t.homeImgOpacity = homeImgOpacity || "0.2"
      t.linkitemGhostBg = "#515151";
      t.notebrColor = "rgba(222, 222, 222, 0.12)";
      t.notebrBoxShadow = "rgb(20, 20, 20)";
      t.notebrHomeHeaderBg = "#181818";
      t.homeLogoOpacity = "0.75";
      t.homeNavBg = 'rgba(0, 0, 0, 0.18)';
      t.homeNavBorderColor = 'rgba(0, 0, 0, 0.2)';

    } else {
      t.bgColor = token.colorBgLayout;
      t.fff = token.colorBgContainer;
      t.borderColor = '#ddd';
      t.colorText = token.colorText;
      t.searcBoxShadowStickled = "rgb(0 0 0) 0px 0px 2px -1px"
      t.searcBoxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)"
      t.homeImgOpacity = "1"
      t.linkitemGhostBg = "rgb(230, 233, 236)";
      t.notebrColor = "rgb(238, 238, 238)";
      t.notebrBoxShadow = "rgb(233, 233, 233)";
      t.notebrHomeHeaderBg = "#f5f5f5";
      t.homeLogoOpacity = "1";
      t.homeNavBg = 'rgba(255, 255, 255, 0.18)';
      t.homeNavBorderColor = 'rgba(255, 255, 255, 0.2)';
    }
    return t;
  }, [systemTheme, homeImgOpacity]);

  const restart = useCallback(_.debounce(() => {
    tools.updateTimeKey();
    link.restart();
    note.init();
  }, 300), []);

  React.useEffect(() => {
    if (documentVisibility === 'visible' && v.isInit) {
      restart();
    }
  }, [documentVisibility]);

  // 清理不在抽屉中的 favicon（定时任务，每2小时执行一次）
  // 只清理超过2小时且不在抽屉中的 favicon，避免频繁删除和重新添加
  const cleanupUnusedFavicons = useCallback(async () => {
    try {
      // 获取所有链接的域名集合
      const allLinks = await db.link.toArray();
      const domainsInLink = new Set();
      allLinks.forEach((link) => {
        if (link.url) {
          try {
            const origin = new URL(link.url).origin;
            domainsInLink.add(origin);
          } catch {
            // ignore invalid URLs
          }
        }
      });

      // 获取所有 favicon 记录
      const allFavicons = await db.favicon.toArray();
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000; // 2小时前的时间戳
      
      const toDelete = allFavicons
        .filter((fav) => {
          // 不在抽屉中的域名
          const notInLink = !domainsInLink.has(fav.domain);
          // 且最后更新时间超过2小时
          const isOld = fav.lastUpdate && fav.lastUpdate < twoHoursAgo;
          return notInLink && isOld;
        })
        .map((fav) => fav.domain);

      if (toDelete.length > 0) {
        await db.favicon.where("domain").anyOf(toDelete).delete();
        console.log(`[favicon] Cleaned up ${toDelete.length} unused favicons (older than 2 hours)`);
      }
    } catch (error) {
      console.error("[favicon] Cleanup error", error);
    }
  }, []);

  React.useEffect(() => {
    tools.messageApi = messageApi;
    link.restart();
    note.init();
    v.isInit = true;
    document.addEventListener('contextmenu', function (e) {
      if (!e.target.classList.contains("search-input")) {
        // 阻止默认的右键菜单弹出
        e.preventDefault();
      }
    });

    window.addEventListener('focus', function () {
      restart();
    });

    // 监听来自 content script 的 favicon 检测消息（直接消息）
    const messageListener = (request, sender, sendResponse) => {
      if (request.type === "PAGE_FAVICON_DETECTED" && request.data) {
        const { domain, iconUrl, size } = request.data;
        if (domain && iconUrl) {
          saveFavicon({ domain, iconUrl, size }).catch((err) => {
            console.error("[favicon] Failed to save favicon from content script", err);
          });
        }
        sendResponse({ ok: true });
        return true; // 异步响应
      }
      if (request.type === "ADD_PENDING_LINK" && request.data) {
        const { url, title } = request.data;
        if (url) {
          link.addPendingLink(url, title).then(() => {
            sendResponse({ ok: true });
          }).catch((err) => {
            console.error("[link] Failed to add pending link", err);
            sendResponse({ ok: false, error: err.message });
          });
          return true; // 异步响应
        }
        sendResponse({ ok: false, error: "Missing URL" });
        return true;
      }
      return false;
    };

    // 处理暂存在 chrome.storage.local 中的 favicon（来自 background）
    const processPendingFavicons = () => {
      const runtime = typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);
      if (runtime && runtime.storage && runtime.storage.local) {
        runtime.storage.local.get(['pendingFavicons'], (result) => {
          const pending = result.pendingFavicons || [];
          if (pending.length > 0) {
            pending.forEach((item) => {
              if (item.domain && item.iconUrl) {
                saveFavicon({ domain: item.domain, iconUrl: item.iconUrl, size: item.size }).catch((err) => {
                  console.error("[favicon] Failed to save pending favicon", err);
                });
              }
            });
            // 清空已处理的
            runtime.storage.local.set({ pendingFavicons: [] });
          }
        });
      }
    };

    const runtime = typeof chrome !== "undefined" ? chrome.runtime : (typeof browser !== "undefined" ? browser.runtime : null);
    if (runtime && runtime.onMessage) {
      runtime.onMessage.addListener(messageListener);
    }

    // 初始化时处理暂存的 favicon
    processPendingFavicons();
    // 定期检查暂存的 favicon（每30秒）
    const pendingCheckInterval = setInterval(() => {
      processPendingFavicons();
    }, 30000);

    // 处理暂存在 chrome.storage.local 中的待添加网址（来自 background）
    const processPendingLinks = () => {
      const runtime = typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);
      if (runtime && runtime.storage && runtime.storage.local) {
        runtime.storage.local.get(['pendingLinks'], (result) => {
          const pending = result.pendingLinks || [];
          if (pending.length > 0) {
            // 批量添加待添加网址
            Promise.all(pending.map((item) => {
              if (item.url) {
                return link.addPendingLink(item.url, item.title).catch((err) => {
                  console.error("[link] Failed to add pending link from storage", err);
                });
              }
              return Promise.resolve();
            })).then(() => {
              // 清空已处理的
              runtime.storage.local.set({ pendingLinks: [] });
            });
          }
        });
      }
    };

    // 初始化时处理暂存的待添加网址
    processPendingLinks();
    // 定期检查暂存的待添加网址（每30秒）
    const pendingLinksCheckInterval = setInterval(() => {
      processPendingLinks();
    }, 30000);

    // 定时清理任务：每2小时执行一次
    const cleanupInterval = setInterval(() => {
      cleanupUnusedFavicons();
    }, 2 * 60 * 60 * 1000); // 2小时

    // 初始化时也执行一次清理（延迟执行，避免影响启动速度）
    setTimeout(() => {
      cleanupUnusedFavicons();
    }, 5000);

    return () => {
      if (runtime && runtime.onMessage) {
        runtime.onMessage.removeListener(messageListener);
      }
      clearInterval(cleanupInterval);
      clearInterval(pendingCheckInterval);
      clearInterval(pendingLinksCheckInterval);
    };
  }, [cleanupUnusedFavicons]);

  React.useEffect(() => {
    if (tabTitle) {
      document.title = tabTitle;
    }
  }, [tabTitle]);

  if (!option.isInit) {
    return null;
  }

  const myTheme = getMyTheme();

  return (
    <div className={`${myTheme.isDark ? 'isDark' : ''}`}>
      <Wrap color={myTheme} />
      <ConfigProvider
        theme={getTheme()}
      >
        <>{children}</>
        {contextHolder}
        {/* <FloatButton /> */}
        <RightClick />
        <Preferences />
        <PublicModal />
        {data.waitType ? (
          <CloudWrap>
            {data.waitType === 'pull' ? <IconCloudDownload size={18} stroke={0.8} /> : <IconCloudUpload size={18} stroke={0.8} />}
          </CloudWrap>
        ) : null}
      </ConfigProvider>
    </div>
  );
};
export default observer(Tower);
