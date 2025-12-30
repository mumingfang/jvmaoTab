import React from "react";
import { observer } from "mobx-react";
import { ReactSortable } from "react-sortablejs";
import { Sortable, MultiDrag } from "sortablejs";
import LinkItem from "~/scenes/Link/LinkItem";
import { motion } from "framer-motion";
import useStores from "~/hooks/useStores";
import useDebounce from "~/hooks/useDebounce";
import { useMemoizedFn } from "ahooks";
import { IconAppWindow, IconPlus, IconBookmark, IconInfoCircle } from "@tabler/icons-react";
import { ExclamationCircleFilled } from "@ant-design/icons";
import styled from "styled-components";
import { Button, Modal, Empty, Tooltip } from "antd";

const chrome = window.chrome;
Sortable.mount(new MultiDrag());

const ListNullWrap = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  color: #ccc;
  margin-top: 20vh;
`;

const AddAll = styled(Button)`
  display: flex;
  align-items: center;
  font-size: 14px !important;
  justify-content: center;
  width: 100%;
  margin-bottom: 10px;
`;

const PendingLinksWrap = styled.div`
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--borderColor);
`;

const PendingLinksTitle = styled.div`
  font-size: 12px;
  color: var(--colorText);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoIcon = styled(IconInfoCircle)`
  cursor: help;
  opacity: 0.6;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
  }
`;


const updateTabList = (list = []) => {
  const newList = [];
  list.forEach((v) => {
    // 屏蔽 Chrome 和 Firefox 的新标签页
    const isChromeNewTab = v.url === "chrome://newtab/";
    const isFirefoxNewTab = v.url === "about:newtab" || v.url === "about:home" || v.url?.startsWith("about:");
    
    if (!isChromeNewTab && !isFirefoxNewTab) {
      newList.push({
        title: v.title,
        icon: v.favIconUrl,
        url: v.url,
        id: v.id,
      });
    }
  });

  return newList;
};

const getTabList = (id) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(
      {
        windowId: id,
      },
      (v) => {
        resolve(updateTabList(v));
      }
    );
  });
};

const itemVariants = {
  visible: (i) => ({
    opacity: 1,
    transform: "translateX(0px) translateZ(0)",
    transition: {
      delay: i * 0.02,
      duration: 0.2,
      ease: "easeOut",
    },
  }),
  hidden: { 
    opacity: 0, 
    transform: "translateX(30px) translateZ(0)",
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

const TabList = (props) => {
  const [id, setID] = React.useState(0);
  const [list, setList] = React.useState([]);
  const [pendingLinks, setPendingLinks] = React.useState([]);
  const [isDataReady, setIsDataReady] = React.useState(false);
  const { tools, link, option } = useStores();
  const { copyClose } = option.item;

  const state = React.useRef({
    isRemove: false,
    // 数据缓存，避免重复查询
    tabListCache: null,
    pendingLinksCache: null,
    cacheTime: 0,
  }).current;

  const handleAddAll = useMemoizedFn(() => {
    Modal.confirm({
      title: "确认添加全部?",
      icon: <ExclamationCircleFilled />,
      content: "即将添加全部网页到新分组",
      okText: "确认",
      okType: "danger",
      cancelText: "取消",
      onOk() {
        link.addPanelToLinkItemEmitter.emit(list);
        if (copyClose) {
          getTabList(id).then((res) => {
            res.forEach(v => {
              // 关闭标签页
              chrome.tabs.remove(v.id);
            })
          });
        }
      },
      onCancel() { },
    });
  }, [list, copyClose]);


  const onChange = useDebounce((newList) => {
    if (copyClose) {
      // 使用当前最新的 list 状态，避免闭包问题
      getTabList(id).then((res) => {
        let map = new Map();
        res.forEach(obj => map.set(obj.id, obj));
        // 使用 newList（最新的列表状态）而不是闭包中的 list
        newList.forEach(obj => map.delete(obj.id));
        Array.from(map.values()).forEach(v => {
          // 关闭标签页
          chrome.tabs.remove(v.id);
        });
      });
    }
    state.isRemove = false;
  }, 150)

  React.useEffect(() => {
    chrome.windows.getCurrent((v) => {
      if (v.id) {
        setID(v.id);
      }
    });
  }, [tools.timeKey]);

  React.useEffect(() => {
    if (!id) {
      return;
    }

    // 检查缓存是否有效（5秒内有效）
    const now = Date.now();
    const cacheValid = state.tabListCache && (now - state.cacheTime < 5000);
    
    if (cacheValid && state.tabListCache.windowId === id) {
      // 使用缓存数据
      setList(state.tabListCache.data);
      setIsDataReady(true);
      return;
    }

    // 并行加载标签页列表和待添加链接
    setIsDataReady(false);
    Promise.all([
      getTabList(id),
      link.getPendingLinks().catch(() => [])
    ]).then(([tabListData, pendingData]) => {
      // 更新缓存
      state.tabListCache = { windowId: id, data: tabListData };
      state.pendingLinksCache = pendingData;
      state.cacheTime = now;
      
      setList(tabListData);
      setPendingLinks(pendingData || []);
      setIsDataReady(true);
    }).catch((err) => {
      console.error("Failed to load tab list data:", err);
      setIsDataReady(true);
    });
  }, [id, tools.timeKey]);

  // 获取待添加网址列表（带缓存）
  const loadPendingLinks = useMemoizedFn(() => {
    const now = Date.now();
    // 检查缓存是否有效（2秒内有效）
    const cacheValid = state.pendingLinksCache && (now - state.cacheTime < 2000);
    
    if (cacheValid) {
      setPendingLinks(state.pendingLinksCache);
      return;
    }

    link.getPendingLinks().then((links) => {
      state.pendingLinksCache = links || [];
      state.cacheTime = now;
      setPendingLinks(state.pendingLinksCache);
    }).catch((err) => {
      console.error("Failed to load pending links:", err);
      setPendingLinks([]);
    });
  });

  // 刷新标签页列表数据
  const refreshTabList = useMemoizedFn(() => {
    if (!id || !props.isShow) {
      return;
    }

    // 清除缓存，强制重新加载
    state.tabListCache = null;
    state.pendingLinksCache = null;
    state.cacheTime = 0;

    setIsDataReady(false);
    Promise.all([
      getTabList(id),
      link.getPendingLinks().catch(() => [])
    ]).then(([tabListData, pendingData]) => {
      const now = Date.now();
      // 更新缓存
      state.tabListCache = { windowId: id, data: tabListData };
      state.pendingLinksCache = pendingData;
      state.cacheTime = now;
      
      setList(tabListData);
      setPendingLinks(pendingData || []);
      setIsDataReady(true);
    }).catch((err) => {
      console.error("Failed to refresh tab list data:", err);
      setIsDataReady(true);
    });
  });

  // 监听标签页激活事件，当界面被激活且 Drawer 打开时更新数据
  React.useEffect(() => {
    if (!props.isShow) {
      return;
    }

    // 立即加载一次
    loadPendingLinks();

    // 监听窗口获得焦点（标签页激活）
    const handleFocus = () => {
      if (props.isShow) {
        refreshTabList();
      }
    };

    // 监听页面可见性变化（从隐藏变为可见）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && props.isShow) {
        refreshTabList();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [props.isShow, id, refreshTabList, loadPendingLinks]);

  // 将待添加网址转换为可拖拽的格式（与 list 格式一致）
  const pendingLinksForDrag = React.useMemo(() => {
    return pendingLinks.map((link) => ({
      title: link.title,
      url: link.url,
      id: link.timeKey, // 使用 timeKey 作为 id，用于拖拽识别
      timeKey: link.timeKey, // 保留 timeKey，用于拖拽后更新 parentId
      linkId: link.linkId, // 保留 linkId，用于更新
      isPending: true, // 标记为待添加网址
    }));
  }, [pendingLinks]);

  // 延迟初始化 ReactSortable，直到数据准备好
  // 当 Drawer 关闭时，不渲染内容以减少 DOM 节点和性能开销
  const shouldRenderSortable = isDataReady && props.isShow;
  const shouldRenderContent = props.isShow;

  return (
    <div>
      {/* 待添加网址列表 */}
      {shouldRenderContent && pendingLinks.length > 0 && shouldRenderSortable && (
        <PendingLinksWrap>
          <PendingLinksTitle>
            <IconBookmark size={14} />
            <span>待添加网址 ({pendingLinks.length})</span>
            <Tooltip title="这些是通过右键菜单收藏的网址，拖拽到分组即可添加到对应分组">
              <InfoIcon size={14} />
            </Tooltip>
          </PendingLinksTitle>
          <ReactSortable
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
            multiDrag={false}
            name="tab-list"
            animation={150}
            selectedClass={"selected"}
            group={{
              name: "linkItem",
              pull: "clone", // 使用 clone 模式，拖拽时创建副本，不从原列表移除
              put: false,
            }}
            sort={false}
            list={pendingLinksForDrag}
            setList={(v) => {
              // 使用 clone 模式时，列表不会被修改，保持原样
            }}
          >
            {pendingLinksForDrag.map((item, i) => {
              return (
                <motion.div
                  style={{
                    opacity: 0,
                    transform: "translateX(30px) translateZ(0)",
                    willChange: "transform, opacity",
                  }}
                  custom={i}
                  animate={props.isShow ? "visible" : "hidden"}
                  variants={itemVariants}
                  key={item.id}
                  data-timekey={item.timeKey}
                  data-linkid={item.linkId}
                  data-ispending="true"
                >
                  <LinkItem
                    title={item.title}
                    url={item.url}
                    timeKey={item.timeKey}
                    linkId={item.linkId}
                    small
                    className={"pending_" + item.id}
                  />
                </motion.div>
              );
            })}
          </ReactSortable>
        </PendingLinksWrap>
      )}

      {shouldRenderContent && list.length !== 0 ? <AddAll
        type="primary"
        icon={<IconPlus size={18} />}
        size="large"
        onClick={handleAddAll}
      >
        添加全部到新分组
      </AddAll> : null}

      {shouldRenderContent ? (
        shouldRenderSortable ? (
        <ReactSortable
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
          multiDrag={false}
          // selected={true}
          name="tab-list"
          animation={150}
          selectedClass={"selected"}
          // fallbackTolerance={3}
          group={{
            name: "linkItem",
            // pull: "clone",
            put: false,
          }}
          sort={false}
          list={list}
          onRemove={() => state.isRemove = true}
          setList={(v) => {
            if (state.isRemove) {
              onChange(v);
            }
            setList(v);
          }}
        >
          {list.length === 0 ? (
            <ListNullWrap>
              <IconAppWindow stroke={1} size={80} />
              <span>您需要先打开一些网页</span>
            </ListNullWrap>
          ) : (
            <>
              {list.map((item, i) => {
                return (
                  <motion.div
                    style={{
                      opacity: 0,
                      transform: "translateX(30px) translateZ(0)",
                      willChange: "transform, opacity",
                    }}
                    custom={i}
                    animate={props.isShow ? "visible" : "hidden"}
                    variants={itemVariants}
                    key={item.id}
                  >
                    <LinkItem
                      title={item.title}
                      url={item.url}
                      small
                      className={"item_" + item.id}
                    />
                  </motion.div>
                );
              })}
            </>
          )}
        </ReactSortable>
        ) : (
          <ListNullWrap>
            <IconAppWindow stroke={1} size={80} />
            <span>加载中...</span>
          </ListNullWrap>
        )
      ) : null}
    </div>
  );
};
export default observer(TabList);