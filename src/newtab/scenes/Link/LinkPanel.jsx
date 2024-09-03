/* eslint-disable react-refresh/only-export-components */
import React from "react";
import {
  useCreation,
  useMemoizedFn,
  useWhyDidYouUpdate,
  useEventEmitter,
  useMouse,
} from "ahooks";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import useDebounce from "~/hooks/useDebounce";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { IconTrash } from "@tabler/icons-react";
import { Col, Row, Modal, message } from "antd";
import { filterLinkList, getID, writeText } from "~/utils";
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
  list.forEach((v) => {
    window.open(v.url);
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

  // useWhyDidYouUpdate("LinkPanel", { state, link });

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
          _.remove(
            link.list,
            (v) => v.timeKey === item.timeKey || v.parentId === item.timeKey
          );
          onChange(link.list);
        },
        onCancel() { },
      });
    } else {
      onDelete([item]);
      _.remove(link.list, (v) => v.timeKey === item.timeKey);
    }
  }, [link.list]);

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
    [link.list, onChange, state]
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

      newPanel.push(...filterLinkList(value, key, true));
      link.list.push(...Array.from(newPanel));

      onChange(link.list);
      state.isChange = false;
    },
    [state, link.getActiveID, link.titleLink.length, link.list, onChange]
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
  }, []);


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
                Promise.resolve().then(() => {
                  setLinkItem(
                    item.timeKey,
                    filterLinkList(value, item.timeKey)
                  );
                  state.updateList[item.timeKey] = false;
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
                      onDelete([v]);
                      _.remove(link.list, (item) => item.timeKey === v.timeKey);
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
  }, [link.titleLink, link.linkForId, linkSpan, onUpdate, state, setLinkItem]);

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
            if (value.length === 0) return;
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
            // console.log('%c [ value ]-281', 'font-size:13px; background:pink; color:#bf2c9f;', value)
          }}
        ></ReactSortable>
        <IconTrash size={40} />
      </motion.div>
    );
  }, [isMove])

  React.useEffect(() => {
    link.addPanelToLinkItemEmitter = addPanelToLinkItem$;
  }, []);

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
