import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Input, Tooltip } from "antd";
import {
  IconPencilMinus,
  IconCopy,
  IconTrashX,
  IconExternalLink,
  IconDeviceDesktop,
  IconDeviceDesktopX,
  IconArrowsMove
} from "@tabler/icons-react";

const LinkTitle = (props) => {
  const {
    item,
    titleClass = "",
    onChange = () => { },
    onDelete = () => { },
    onOpenAll = () => { },
    onCopyAll = () => { },
  } = props;
  const [isEdit, setIsEdit] = React.useState(false);
  const inputRef = React.useRef(null);
  const { option, tools } = useStores();

  const { homeLinkTimeKey } = option.item;

  const onInputBlur = (event) => {
    const value = event.target.value;
    if (value) {
      item.title = value;
      onChange(value);
    }
    setIsEdit(false);
  };

  const onEdit = () => {
    setIsEdit(true);
    setTimeout(() => {
      inputRef.current.focus({
        cursor: "end",
      });
    }, 0);
  };

  const onContextMenu = React.useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const menuItem = [
      {
        label: "打开全部链接",
        icon: <IconExternalLink />,
        key: "open-all-link",
        onClick: onOpenAll,
      },
      {
        label: "复制全部链接",
        icon: <IconCopy />,
        key: "copy-all-link",
        onClick: onCopyAll,
      },
      {
        label: "编辑标题",
        icon: <IconPencilMinus />,
        key: "edit-title",
        onClick: onEdit,
      },
      {
        label: "移动分组",
        icon: <IconArrowsMove />,
        key: "move-group",
        onClick: () => {
          tools.openPublicModal("MoveGroup", {
          }, 'auto','移动分组');
        },
      },
      {
        label: "删除分组",
        icon: <IconTrashX />,
        key: "del-group",
        onClick: onDelete,
      },
    ];
    if (homeLinkTimeKey == item.timeKey) {
      menuItem.push({
        label: "从首屏移除",
        icon: <IconDeviceDesktopX />,
        key: "del-home",
        onClick: () => {
          option.setItem("homeLinkTimeKey", null);
        },
      });
    } else {
      menuItem.push({
        label: "添加到首屏",
        icon: <IconDeviceDesktop />,
        key: "add-home",
        onClick: () => {
          option.setItem("homeLinkTimeKey", item.timeKey);
        },
      });
    }
    tools.setRightClickEvent(e, menuItem);
  }, [item.timeKey, homeLinkTimeKey]);

  return (
    <div className="link-title" onContextMenu={onContextMenu}>
      {isEdit ? (
        <div>
          <Input
            type="text"
            ref={inputRef}
            className={titleClass + " link-title-item link-title-input"}
            defaultValue={item.title}
            onBlur={onInputBlur}
            bordered={false}
          />
        </div>
      ) : (
        <h4 onClick={onEdit} className={titleClass + " link-title-item"}>
          {item.title}
        </h4>
      )}
      {homeLinkTimeKey == item.timeKey ? (
        <Tooltip title="此分组已在首屏展示">
          <div className="link-title-icon">
            <IconDeviceDesktop
              size={18}
              stroke={1.6}
            />
          </div>
        </Tooltip>
      ) : null}
    </div>
  );
};

export default observer(LinkTitle);
