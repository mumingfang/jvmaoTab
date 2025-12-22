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
    x: 0,
    transition: {
      delay: i * 0.03,
    },
  }),
  hidden: { opacity: 0, x: "30px" },
};

const TabList = (props) => {
  const [id, setID] = React.useState(0);
  const [list, setList] = React.useState([]);
  const [pendingLinks, setPendingLinks] = React.useState([]);
  const { tools, link, option } = useStores();
  const { copyClose } = option.item;

  const state = React.useRef({
    isRemove: false,
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


  const onChange = useDebounce((v) => {
    if (copyClose) {
      getTabList(id).then((res) => {
        let map = new Map();
        res.forEach(obj => map.set(obj.id, obj));
        list.forEach(obj => map.delete(obj.id));
        Array.from(map.values()).forEach(v => {
          // 关闭标签页
          chrome.tabs.remove(v.id);
        })
      });
    }
    state.isRemove = false
  }, 150)

  React.useEffect(() => {
    chrome.windows.getCurrent((v) => {
      if (v.id) {
        setID(v.id);
      }
    });
  }, [tools.timeKey]);

  React.useEffect(() => {
    if (id) {
      getTabList(id).then(setList);
    }
  }, [id, tools.timeKey]);

  // 获取待添加网址列表
  const loadPendingLinks = useMemoizedFn(() => {
    link.getPendingLinks().then((links) => {
      setPendingLinks(links || []);
    }).catch((err) => {
      console.error("Failed to load pending links:", err);
      setPendingLinks([]);
    });
  });

  React.useEffect(() => {
    loadPendingLinks();
    // 监听 link.list 的变化，当有新的待添加网址时刷新
    const interval = setInterval(() => {
      loadPendingLinks();
    }, 300); // 缩短刷新间隔，从 1000ms 改为 300ms
    return () => clearInterval(interval);
  }, [loadPendingLinks, link.list]);

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

  return (
    <div>
      {/* 待添加网址列表 */}
      {pendingLinks.length > 0 && (
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
                    x: "30px",
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

      {list.length !== 0 ? <AddAll
        type="primary"
        icon={<IconPlus size={18} />}
        size="large"
        onClick={handleAddAll}
      >
        添加全部到新分组
      </AddAll> : null}

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
                    x: "30px",
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
    </div>
  );
};
export default observer(TabList);