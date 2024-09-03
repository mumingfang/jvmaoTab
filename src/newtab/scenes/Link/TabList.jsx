import React from "react";
import { observer } from "mobx-react";
import { ReactSortable } from "react-sortablejs";
import { Sortable, MultiDrag } from "sortablejs";
import LinkItem from "~/scenes/Link/LinkItem";
import { motion } from "framer-motion";
import useStores from "~/hooks/useStores";
import useDebounce from "~/hooks/useDebounce";
import { useMemoizedFn } from "ahooks";
import { IconAppWindow, IconPlus } from "@tabler/icons-react";
import { ExclamationCircleFilled } from "@ant-design/icons";
import styled from "styled-components";
import { Button, Modal } from "antd";

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

const updateTabList = (list = []) => {
  const newList = [];
  list.forEach((v) => {
    if (v.url !== "chrome://newtab/") {
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

  return (
    <div>
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