/* eslint-disable react-refresh/only-export-components */
import React from "react";
import {
  useCreation,
  useMemoizedFn,
  useEventEmitter,
} from "ahooks";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import useDebounce from "~/hooks/useDebounce";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { IconTrash } from "@tabler/icons-react";
import { Col, Row, Modal } from "antd";
import { filterLinkList, getID, writeText, openUrl } from "~/utils";
import _ from "lodash";
import { ReactSortable } from "react-sortablejs";
import LinkItem from "~/scenes/Link/LinkItem";
import LinkTitle from "~/scenes/Link/LinkTitle";
import { motion } from "framer-motion";

const { confirm } = Modal;

const defaultTitle = "分组";

const spanArr = {
  8: 3,
  6: 4,
  4: 6
}

const delAnimations = {
  show: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
  },
  hidden: {
    opacity: 0,
    y: '100%',
    x: '100%',
    scale: 0.8,
  }
};

const sortableTag = React.forwardRef((props, ref) => {
  return (
    <Row ref={ref} gutter={[16, 16]}>
      {props.children}
    </Row>
  );
});


// 打开全部网页
const openAllLink = (list) => {
  if (!list || !Array.isArray(list)) {
    return;
  }
  list.forEach((v) => {
    if (v && v.url) {
      // 使用openUrl统一处理，自动识别特殊协议
      openUrl(v.url, { newTab: true });
    }
  });
};

const LinkPanel = (props) => {
  const { link, tools, option } = useStores();
  const { linkSpan } = option.item;
  const { warpRef } = props;
  const [isMove, setIsMove] = React.useState(false);
  const scrollContainerRef = React.useRef(null);

  const state = React.useRef({
    updateList: [],
    isChange: false,
  }).current;


  const addPanelToLinkItem$ = useEventEmitter();
  addPanelToLinkItem$.useSubscription((value) => {
    if ((value || []).length === 0) return;
    addPanelToLinkItem(value);
    tools.tabListDrawer = false;
  });

  const onChange = useDebounce((value) => {
    link.updateData(value);
    setTimeout(() => {
      link.setCache();
    }, 0);
  }, 150);

  const onUpdate = useDebounce((value) => {
    link.updateLink(value);
    setTimeout(() => {
      link.setCache();
    }, 0);
  }, 150);

  const onDelete = useDebounce((value) => {
    link.deleteLinkByTimeKey(value.map((v) => v.timeKey));
    setTimeout(() => {
      link.setCache();
    }, 0);
  }, 150);

  const onDelPanel = useMemoizedFn((item, delAll = false) => {
    if (delAll) {
      confirm({
        title: "确认删除全部?",
        icon: <ExclamationCircleFilled />,
        content: "即将删除此分组下所有链接",
        okText: "确认",
        okType: "danger",
        cancelText: "取消",
        onOk() {
          const itemsToDelete = link.list.filter(
            (v) => v.timeKey === item.timeKey || v.parentId === item.timeKey
          );
          _.remove(
            link.list,
            (v) => v.timeKey === item.timeKey || v.parentId === item.timeKey
          );
          onDelete(itemsToDelete);
          onChange(link.list);
        },
        onCancel() { },
      });
    } else {
      _.remove(link.list, (v) => v.timeKey === item.timeKey);
      onDelete([item]);
    }
  }, [onDelete, onChange]);

  const setLinkItem = useMemoizedFn(
    (parentId, value) => {
      // lodash 删除list中parentId相同的数据
      _.remove(link.list, (v) => v.parentId === parentId);
      // list 合并新数据
      link.list.push(...Array.from(value));
      if (state.isChange) {
        onChange(link.list);
        state.isChange = false;
      }
    },
    [onChange]
  );

  const addPanelToLinkItem = useMemoizedFn(
    (value) => {
      state.isChange = true;
      const key = getID();
      const newPanel = [];

      newPanel.push({
        title: defaultTitle,
        timeKey: key,
        parentId: link.getActiveID,
        sort: link.titleLink.length,
      });

      // 对于待添加网址（有 timeKey），需要从数据库获取完整数据并直接更新
      const processedValue = value.map((v) => {
        if (v.timeKey) {
          // 从数据库获取完整数据
          return link.getLinkByTimeKey(v.timeKey).then((linkData) => {
            if (linkData) {
              // 如果是待添加网址（parentId === "000000"），直接更新数据库，不添加到列表
              if (linkData.parentId === "000000") {
                return link.addPendingLinksToGroup(v.timeKey, key).then(() => {
                  // 更新成功，返回 null 表示不添加到列表（会通过刷新自动显示）
                  return null;
                }).catch((err) => {
                  console.error("Failed to update pending link:", err);
                  return null;
                });
              }
              // 返回合并后的数据
              return {
                ...linkData,
                ...v,
                linkId: linkData.linkId,
                parentId: key, // 更新为新分组的 parentId
              };
            }
            return v;
          }).catch((err) => {
            console.error("addPanelToLinkItem error:", err);
            return v;
          });
        }
        return Promise.resolve(v);
      });
      
      Promise.all(processedValue).then((resolvedValue) => {
        // 分离待添加网址（返回 null 的）和普通链接
        const pendingPromises = [];
        const validItems = [];
        
        resolvedValue.forEach((v, index) => {
          if (v === null) {
            // 这是待添加网址，已经更新到数据库，需要从数据库获取更新后的数据
            const originalItem = value[index];
            if (originalItem && originalItem.timeKey) {
              pendingPromises.push(
                link.getLinkByTimeKey(originalItem.timeKey).then((updatedLink) => {
                  if (updatedLink && updatedLink.parentId === key) {
                    return updatedLink;
                  }
                  return null;
                }).catch(() => null)
              );
            }
          } else {
            validItems.push(v);
          }
        });
        
        // 等待所有待添加网址更新完成
        Promise.all(pendingPromises).then((updatedPendingLinks) => {
          // 将更新后的待添加网址添加到 validItems
          const allValidItems = [...validItems, ...updatedPendingLinks.filter(v => v !== null)];
          
          newPanel.push(...filterLinkList(allValidItems, key, false));
          link.list.push(...Array.from(newPanel));

          onChange(link.list);
          state.isChange = false;
        });
      });
    },
    [link.getActiveID, link.titleLink.length, onChange, link]
  );

  // 复制全部网页
  const onCopyAll = useMemoizedFn((list) => {
    const text = list.map((v) => v.title + " " + v.url).join("\n");
    writeText(text).then((res) => {
      if (res) {
        tools.messageApi.open({
          type: "success",
          content: "复制成功",
        });
      } else {
        tools.messageApi.open({
          type: "error",
          content: "复制失败",
        });
      }
    });
  }, [tools]);


  const panelDom = useCreation(() => {
    // console.log("刷新视图 - 分组");
    return link.titleLink.map((item, index) => {
      const list = link.linkForId(item.timeKey);
      return (
        <div className={`link-panel link-module-span-${spanArr[linkSpan]}`} key={item.timeKey}>
          <LinkTitle
            item={item}
            onChange={() => {
              onUpdate([item]);
            }}
            onOpenAll={() => {
              openAllLink(list);
            }}
            onCopyAll={() => {
              onCopyAll(list);
            }}
            onDelete={() => {
              onDelPanel(item, list.length > 0);
            }}
          />
          <ReactSortable
            tag={sortableTag}
            name="tab-list"
            animation={150}
            group="linkItem"
            ghostClass={[`link-item-ghost`]}
            list={list}
            scroll={scrollContainerRef.current}
            setList={(value) => {
              if (state.updateList[item.timeKey]) {
                state.isChange = true;
                // 找出新增的项（待添加网址）
                const currentTimeKeys = new Set(list.map(l => l.timeKey));
                const newItems = value.filter(v => v.timeKey && !currentTimeKeys.has(v.timeKey));
                
                // 对于新增的待添加网址，先更新数据库，然后从 value 中移除（避免重复添加）
                const updatePromises = newItems.map((newItem) => {
                  if (newItem.timeKey) {
                    return link.getLinkByTimeKey(newItem.timeKey).then((linkData) => {
                      if (linkData && linkData.parentId === "000000") {
                        // 直接更新数据库
                        return link.addPendingLinksToGroup(newItem.timeKey, item.timeKey).then(() => {
                          // 更新成功后，从数据库中重新获取更新后的数据
                          return link.getLinkByTimeKey(newItem.timeKey);
                        }).catch((err) => {
                          console.error("Failed to update pending link:", err);
                          return null;
                        });
                      }
                      return linkData;
                    }).catch((err) => {
                      console.error("Error fetching linkData:", err);
                      return null;
                    });
                  }
                  return Promise.resolve(null);
                });
                
                Promise.all(updatePromises).then((updatedLinks) => {
                  // 将成功更新的待添加网址添加到 value 中，替换原来的项
                  const successfullyUpdated = updatedLinks.filter(ul => ul && ul.parentId === item.timeKey);
                  
                  // 用更新后的数据替换 value 中的待添加网址
                  const replacedValue = value.map((v) => {
                    const updated = updatedLinks.find(ul => ul && ul.timeKey === v.timeKey);
                    if (updated && updated.parentId === item.timeKey) {
                      // 用更新后的数据替换
                      return updated;
                    }
                    return v;
                  });
                  
                  // 处理所有项，确保数据完整
                  const processedValue = replacedValue.map((v) => {
                    if (v.timeKey) {
                      // 如果已经是更新后的数据（有 linkId 和正确的 parentId），直接返回
                      if (v.linkId && v.parentId === item.timeKey) {
                        return Promise.resolve(v);
                      }
                      // 否则从数据库获取
                      return link.getLinkByTimeKey(v.timeKey).then((linkData) => {
                        if (linkData) {
                          return {
                            ...linkData,
                            ...v,
                            linkId: linkData.linkId,
                            parentId: item.timeKey,
                          };
                        }
                        return v;
                      }).catch(() => v);
                    }
                    return Promise.resolve(v);
                  });
                  
                  Promise.all(processedValue).then((resolvedValue) => {
                    setLinkItem(
                      item.timeKey,
                      filterLinkList(resolvedValue, item.timeKey, false)
                    );
                    state.updateList[item.timeKey] = false;
                  });
                });
              }
            }}
            onStart={(e) => {
              setIsMove(true);
            }}
            onEnd={(e) => {
              setIsMove(false);
            }}
            onUpdate={(e) => {
              state.updateList[item.timeKey] = true;
            }}
            onAdd={(e) => {
              state.updateList[item.timeKey] = true;
            }}
            onRemove={(e) => {
              state.updateList[item.timeKey] = true;
            }}
          >
            {list.map((v) => {
              return (
                <Col span={spanArr[linkSpan]} key={v.timeKey}>
                  <LinkItem
                    {...v}
                    onDelete={() => {
                      _.remove(link.list, (item) => item.timeKey === v.timeKey);
                      onDelete([v]);
                    }}
                  />
                </Col>
              );
            })}
          </ReactSortable>
        </div>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.titleLink, link.linkForId, linkSpan, onUpdate, setLinkItem, onDelete, onDelPanel, onCopyAll]);

  const newPanelDom = useCreation(() => {
    return (
      <div
        className={`link-new-panel ${link.titleLink.length === 0 ? "null fadeIn-element" : ""
          }`}
      >
        {link.titleLink.length === 0 ? (
          <span className="null_help ">请从右侧拖入标签到区块内</span>
        ) : null}
        <ReactSortable
          name="tab-list"
          animation={150}
          group="linkItem"
          ghostClass={["link-item-ghost-new"]}
          list={[]}
          setList={(value) => {
            if (!value || !Array.isArray(value) || value.length === 0) return;
            addPanelToLinkItem(value);
          }}
        ></ReactSortable>
      </div>
    );
  }, [addPanelToLinkItem, link.titleLink]);

  const delPanel = useCreation(() => {
    return (
      <motion.div
        className="link-delect-panel"
        initial={'hidden'}
        animate={isMove ? 'show' : "hidden"}
        variants={delAnimations}
        transition={{ duration: 0.2, ease: "easeIn" }}
      >
        <ReactSortable
          name="tab-list"
          animation={150}
          group="linkItem"
          className="link-delect-panel-box"
          ghostClass={["link-item-delect"]}
          list={[]}
          setList={(value) => {
            if (!value || !Array.isArray(value) || value.length === 0) {
              return;
            }
            // 从列表中删除拖拽到删除面板的项
            value.forEach((item) => {
              if (item && item.timeKey) {
                _.remove(link.list, (v) => v.timeKey === item.timeKey);
              }
            });
            onDelete(value);
          }}
        ></ReactSortable>
        <IconTrash size={40} tabIndex="-1"/>
      </motion.div>
    );
  }, [isMove, onDelete])

  React.useEffect(() => {
    link.addPanelToLinkItemEmitter = addPanelToLinkItem$;
    return () => {
      // 清理事件订阅
      if (link.addPanelToLinkItemEmitter) {
        link.addPanelToLinkItemEmitter = null;
      }
    };
  }, [addPanelToLinkItem$, link]);

  React.useEffect(() => {
    if (warpRef.current && !scrollContainerRef.current) {
      scrollContainerRef.current = warpRef.current.querySelector(".scroll-container");
    }
  }, [warpRef, scrollContainerRef])

  if (!link.isInit) {
    return null;
  }

  return (
    <>
      {panelDom}
      {newPanelDom}
      {delPanel}
    </>
  );
};
export default observer(LinkPanel);
