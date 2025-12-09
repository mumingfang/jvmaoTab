import React from "react";
import { useCreation, useMemoizedFn } from "ahooks";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Card, Typography, Tooltip } from "antd";
import FavIconIcon from "~/scenes/public/FavIconIcon";
import { IconPencilMinus, IconCopy, IconTrashX } from "@tabler/icons-react";
import { writeText, isSpecialProtocol, openUrl } from "~/utils";



const LinkItem = (props) => {
  const { small, onDelete = () => { } } = props;
  const { option, tools } = useStores();
  const { linkOpenSelf } = option.item;


  // const onClick = useMemoizedFn(() => {
  //   if (!props.url) {
  //     return;
  //   }

  //   if (!small) {
  //     if (linkOpenSelf) {
  //       window.location.href = props.url;
  //     } else {
  //       window.open(props.url);
  //     }
  //   }
  // }, [props.url, small, linkOpenSelf]);

  const onCopy = useMemoizedFn((text) => {
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

  // 处理链接点击，特殊协议使用chrome.tabs API
  const handleLinkClick = useMemoizedFn((e) => {
    if (!props.url || small) {
      return;
    }

    // 检测是否为特殊协议
    if (isSpecialProtocol(props.url)) {
      // 阻止默认行为
      e.preventDefault();
      e.stopPropagation();
      
      // 检测修饰键（Cmd/Ctrl）或中键点击，决定是否在新标签页打开
      // e.button === 1 是中键点击，e.button === 0 是左键点击
      const isNewTab = e.metaKey || e.ctrlKey || e.button === 1;
      
      // 使用chrome.tabs API打开
      // 如果Cmd+点击或中键点击，强制新标签页；否则根据linkOpenSelf配置决定
      openUrl(props.url, {
        newTab: isNewTab || !linkOpenSelf,
        linkOpenSelf: linkOpenSelf
      });
    }
    // 如果不是特殊协议，让默认行为继续（保持原生行为）
  }, [props.url, small, linkOpenSelf]);

  const onContextMenu = useMemoizedFn((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (small) {
      return;
    }
    tools.setRightClickEvent(e, [
      {
        label: "编辑链接",
        key: "edit-link",
        icon: <IconPencilMinus />,
        onClick: () => {
          tools.openPublicModal(
            "EditLink",
            {
              title: props.title,
              url: props.url,
              timeKey: props.timeKey,
              linkId: props.linkId,
              isLink: true,
            },
            400
          );
        },
      },
      {
        label: "复制链接",
        icon: <IconCopy />,
        key: "copy-link",
        onClick: () => {
          onCopy(props.url);
        }
      },
      {
        label: "删除链接",
        icon: <IconTrashX />,
        key: "del-link",
        onClick: () => {
          onDelete();
        },
      },
    ]);
  }, [props.url, props.title, props.timeKey, props.linkId, small, tools, onCopy, onDelete]);

  const item = useCreation(() => {
    // console.log("刷新视图 - 链接");
    const Text = small ? Typography.Text : Typography.Paragraph;
    return (
      <Card
        hoverable
        bordered={small}
        className={`link-item ${small ? "small" : ""} ${props.url ? "" : "disabled"}`}
        size="small"
        // onClick={onClick}
        onContextMenu={onContextMenu}
      >
        <div className={"link-item-body-left"}>
          <FavIconIcon size={small ? 20 : 30} url={props.url} />
        </div>
        <div className={"link-item-body-right"}>
          <Text ellipsis={small ? true : { rows: 2, expandable: false }}>
            {props.title}
          </Text>
        </div>
        {!small && props.url ? (
          <a 
            className="link-a" 
            tabIndex="-1" 
            href={props.url} 
            target={linkOpenSelf ? '_blank' : '_self'}
            onClick={handleLinkClick}
            onAuxClick={handleLinkClick}
          ></a>
        ) : null}

      </Card>
    );
  }, [props.title, props.url, small, linkOpenSelf, onContextMenu, handleLinkClick]);

  if (!props.url) {
    return (
      <Tooltip title="链接为空">
        {item}
      </Tooltip>
    )
  } else {
    return item;
  }
};
export default observer(LinkItem);
