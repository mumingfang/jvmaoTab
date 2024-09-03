import React from "react";
import { useCreation, useMemoizedFn } from "ahooks";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Card, Typography, Tooltip } from "antd";
import FavIconIcon from "~/scenes/public/FavIconIcon";
import { IconPencilMinus, IconCopy, IconTrashX } from "@tabler/icons-react";
import { writeText } from "~/utils";



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
  }, []);

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
  }, [props.url]);

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
        {!small && props.url ? (<a className="link-a" href={props.url} target={linkOpenSelf ? '_blank' : '_self'} ></a>) : null}

      </Card>
    );
  }, [props.title, props.url, small, linkOpenSelf]);

  if (!props.url) {
    return (
      <Tooltip title="连接为空">
        {item}
      </Tooltip>
    )
  } else {
    return item;
  }
};
export default observer(LinkItem);
