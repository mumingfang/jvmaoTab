import React from "react";
import { observer } from "mobx-react";
import { Badge, theme, Divider } from "antd";
import styled from "styled-components";
import {
  IconPencilMinus,
  IconFolderPlus,
  IconTrashX,
  IconInfoCircle,
  IconFolder,
  IconSettings,
  IconNotes,
  IconLink,
  IconArrowsMove,
  IconDatabaseExport,
  IconBrandHipchat,
} from "@tabler/icons-react";
import { getID } from "~/utils";
import useStores from "~/hooks/useStores";
import { useReactive, useCreation, useMemoizedFn } from "ahooks";
import { useNavigate, useLocation } from 'react-router-dom';
import { headerHeight } from "~/view/Home";
import manifest from "../../../manifest";
import Storage from "~/utils/storage";


const { useToken } = theme;

const linkNavUrl = "https://n.mumingfang.com/?ref=jvmao";
const groupUrl = "https://mumingfang.com/group-11-1.html?ref=jvmao";

function getItem({
  label,
  key,
  icon,
  children,
  id,
  type,
  _info,
}) {
  return {
    key,
    icon,
    children,
    label,
    type,
    _info,
    id
  };
}

const saveLActiveCache = (e) => {
  Storage.set('navActive', {
    type: e.type,
    _key: e.key
  }).then(() => {

  }).catch((err) => {
    console.log('%c [ err ]-196', 'font-size:13px; background:pink; color:#bf2c9f;', err)
  })
}

const NavWrap = styled.div`
  height: calc(100vh - ${(props) => (props.headerHeight)}px);
  background-color: var(--fff);
  border-right: 1px solid var(--borderColor);
  margin: 0;
  display: flex;
  flex-direction: column;
`;

const NavTOP = styled.ul`
  overflow-y: auto;
  flex: 1;
  padding: 4px;
  box-sizing: border-box;
  margin: 0;
`;
const NavBottom = styled.div`
  padding: 8px 0;
  box-sizing: border-box;
  margin: 0px;
  display: flex;
  -webkit-box-align: center;
  align-items: baseline;
  -webkit-box-pack: center;
  justify-content: center;
  gap: 12px;
  height: 28px;
  line-height: 1;
  > span {
    font-size: 12px;
    color: #aaa;
    cursor: pointer;
    &:hover{
      color: #999;
    }
  }
  > i {
    font-size: 10px;
    color: #aaa;
    font-style: normal;
  }
`;

const NavLi = styled.li`
  display: flex;
  align-items: center;
  padding: 0 20px 0 24px;
  height: 40px;
  gap: 8px;
  cursor: pointer;
  border-radius: ${(props) => (props.color.borderRadius)}px;
  color: var(--colorText);
  &.active {
    background-color: ${(props) => (props.color.bgColor)};
    color: ${(props) => (props.color.color)};
  }
  &:hover {
    background-color: ${(props) => (props.color.bgColorHover)};
  }
  span {
    font-size: 14px;
  }
  &+&{
    margin-top: 4px;
  }
  &:last-child{
    margin-bottom: 28px;
  }
`;

const Nav = (props) => {
  const { link, tools, option, data } = useStores();
  const { showLinkNav, linkOpenSelf } = option.item;
  const { token } = useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const state = useReactive(
    {
      activeKey: "",
    },
    []
  );

  const onLinkTitleClick = useMemoizedFn(
    (timeKey) => {
      if (!timeKey != state.activeKey) {
        state.activeKey = timeKey;
        link.setActiveId(timeKey);
      }
    },
    [state.activeKey]
  );

  const foo = useCreation(() => {
    const n = [
      ...link.linkNav.map((item, index) => {
        return getItem({
          label: item.title,
          key: item.timeKey,
          id: item.linkId,
          icon: <IconFolder size={16} stroke={0.8} />,
          type: "link",
          _info: item,
        });
      }),
      {
        type: "divider",
      },
      getItem({
        label: "便签",
        key: "note",
        icon: <IconNotes size={20} stroke={1} />,
      }),
      {
        type: "divider",
      },
    ];

    n.push(getItem({
      label: "首选项",
      key: "preferences",
      icon: <IconSettings size={20} stroke={1} />,
    }));
    // n.push(getItem({
    //   label: "数据导出",
    //   key: "export",
    //   icon: <IconDatabaseExport size={20} stroke={1} />,
    // }));
    return n;
  }, [link.linkNav, onLinkTitleClick, showLinkNav]);

  const isActive = useMemoizedFn((key, type) => {
    if (type == "link" && location.pathname == '/') {
      return state.activeKey == key
    } else {
      if (key == "note") {
        return location.pathname == "/note"
      }
    }
    return false

  }, [state.activeKey, location.pathname])


  const onClick = useMemoizedFn((e) => {
    if (e.type == 'link') {
      navigate('/');
      onLinkTitleClick(e.key);
      saveLActiveCache(e);
    } else if (e.key === "preferences") {
      tools.preferencesOpen = true;
    } else if (e.key === "note") {
      navigate('/note');
      saveLActiveCache(e);
    } else if (e.key === "Manual") {
      tools.openPublicModal("Manual", {}, '90vw');
      // option.resetOption("");
    } else if (e.key === "export") {
      tools.onExport();
    } else if (e.key === "discuss") {
      if (linkOpenSelf) {
        window.location.href = groupUrl;
      } else {
        window.open(groupUrl);
      }
    } else if (e.key === "linkNav") {
      if (linkOpenSelf) {
        window.location.href = linkNavUrl;
      } else {
        window.open(linkNavUrl);
      }
    }

  }, [linkOpenSelf]);

  const onContextMenu = useMemoizedFn((e, props) => {
    e.stopPropagation();
    e.preventDefault();
    const menuArr = [];

    if (props.type == "link") {
      menuArr.push({
        label: "重命名",
        key: "edit-link",
        icon: <IconPencilMinus />,
        onClick: () => {
          console.log("[ title ] >", props);
          tools.openPublicModal(
            "EditLink",
            {
              title: props.label,
              timeKey: props.key,
              linkId: props.id,
              type: 'menu',
              modalTitle: '重命名',
              cb: () => {
                link.updateNav();
              }
            },
            400
          );
        },
      });
      menuArr.push({
        label: "移动抽屉",
        icon: <IconArrowsMove />,
        key: "move-group",
        onClick: () => {
          tools.openPublicModal("MoveGroup", {
          }, 'auto', '移动抽屉');
        },
      });
      menuArr.push({
        label: "删除页面",
        icon: <IconTrashX />,
        key: "del-link",
        onClick: () => {
          const link_nav = foo.filter((v) => v.type == "link");

          if (props._info.hide) {
            tools.messageApi.warning('暗格无法删除')
            return
          }

          if (link_nav.length == 1) {
            tools.messageApi.warning('请至少保留一个页面')
            return
          }

          link.getLinkByParentId(props.key).then((res) => {

            if (res.length) {
              tools.messageApi.warning('请先清空页面下的所有链接和分组')
              return
            }
            link.deleteLinkByTimeKey(props.key).then(() => {
              if (link.getActiveID == props.key) {
                link.activeId = ""
                link.getNav()
                setTimeout(() => {
                  state.activeKey = link.getActiveID;
                }, 300);
              } else {
                link.updateNav();
              }

            });
          });
        },
      });
    }

    menuArr.push({
      label: "新建抽屉",
      key: "new-link",
      icon: <IconFolderPlus />,
      onClick: () => {
        link.addLink({
          parentId: link.linkNav[link.linkNav.length - 1].parentId,
          title: '新抽屉',
          timeKey: getID()
        }).then((res) => {
          link.updateNav();
        })
      }
    });

    tools.setRightClickEvent(e, menuArr);
  }, [link.linkNav]);

  React.useEffect(() => {
    if (!state.activeKey) {
      if (link.linkNav[0]?.timeKey) {
        state.activeKey = link.linkNav[0].timeKey;
      }
    }
  }, [link.linkNav, state.openKeys]);

  React.useEffect(() => {
    Storage.get('navActive').then((e) => {
      if (e) {
        setTimeout(() => {
          onClick({
            type: e.type,
            key: e._key
          }, false);
        }, 100);
      }
    });
  }, []);

  return (
    <NavWrap headerHeight={headerHeight}>
      <NavTOP className="scroll-container">
        {foo.map((v, k) => {
          if (v.type === "divider") {
            return <Divider key={v.key} style={{ margin: "8px 0" }} />;
          }
          return (
            <NavLi
              className={isActive(v.key, v.type) ? "active" : ""}
              color={{
                borderRadius: token.borderRadius,
                bgColor: token.colorPrimaryBg,
                color: token.colorPrimaryText,
                bgColorHover: token.controlItemBgHover,
              }}
              onClick={() => onClick(v)}
              onContextMenu={(e) => onContextMenu(e, v)}
              key={v.key}>
              {v.icon}
              <span>{v.label}</span>
            </NavLi>
          )
        })}
      </NavTOP>
      <NavBottom>
        <span onClick={() => onClick({ key: 'Manual' })}>关于</span>
        <span onClick={() => onClick({ key: 'discuss' })}>讨论</span>
        {showLinkNav ? <span onClick={() => onClick({ key: 'linkNav' })}>导航</span> : null}
        <i>v{manifest.version}</i>
      </NavBottom>
    </NavWrap>
  );
};
export default observer(Nav);
