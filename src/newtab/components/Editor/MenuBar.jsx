import React from "react";
import { useMemoizedFn } from "ahooks";
import { Button, Tooltip } from "antd";
import {
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconListDetails,
} from "@tabler/icons-react";

function MenuBar(props) {
  const { editor } = props;

  if (!editor) {
    return null;
  }

  const menuItem = useMemoizedFn((item) => {
    const { onClick, disabled, active, title, Icon } = item;
    return (
      <Tooltip title={title}>
        <Button
          onClick={onClick}
          disabled={disabled}
          type={active ? "primary" : "text"}
          icon={<Icon size={20} stroke={1.4} />}
        />
      </Tooltip>
    );
  }, []);

  return (
    <div className="sn-editor-menuBar">
      <div>
        {menuItem({
          onClick: () => editor.chain().focus().toggleBold().run(),
          disabled: !editor.can().chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
          title: "加粗",
          Icon: IconBold,
        })}

        {menuItem({
          onClick: () => editor.chain().focus().toggleBulletList().run(),
          disabled: false,
          active: editor.isActive("bulletList"),
          title: "无序列表",
          Icon: IconList,
        })}
        {menuItem({
          onClick: () => editor.chain().focus().toggleTaskList().run(),
          disabled: false,
          active: editor.isActive("taskList"),
          title: "任务列表",
          Icon: IconListDetails,
        })}


        {menuItem({
          onClick: () => editor.chain().focus().undo().run(),
          disabled: !editor.can().chain().focus().undo().run(),
          active: false,
          title: "撤销",
          Icon: IconArrowBackUp,
        })}

        {menuItem({
          onClick: () => editor.chain().focus().redo().run(),
          disabled: !editor.can().chain().focus().redo().run(),
          active: false,
          title: "重做",
          Icon: IconArrowForwardUp,
        })}

      </div>
    </div>
  );
}

export default MenuBar;
