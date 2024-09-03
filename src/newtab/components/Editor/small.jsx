import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button, Tooltip } from "antd";
import Link from "@tiptap/extension-link";
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import StarterKit from "@tiptap/starter-kit";
// import Image from "./image";
import { useDebounceFn, useMemoizedFn } from "ahooks";
import {
    IconBold,
    IconItalic,
    IconList,
    IconListDetails,
} from "@tabler/icons-react";
import "./small.scss";
import styled from "styled-components";


const Btn = styled(Button)`
  display: flex;
  justify-content: center;
  align-items: center;
`;


function MenuBar(props) {
    const { editor } = props;

    if (!editor) {
        return null;
    }

    const menuItem = useMemoizedFn((item) => {
        const { onClick, disabled, active, title, Icon } = item;
        return (
            <Tooltip title={title}>
                <Btn
                    onClick={onClick}
                    disabled={disabled}
                    size="small"
                    type={"text"}
                    icon={<Icon size={16} stroke={1.4} />}
                />
            </Tooltip>
        );
    }, []);
    return (
        <div className="sn-small-editor-menuBar">
            {menuItem({
                onClick: () => editor.chain().focus().toggleBold().run(),
                disabled: !editor.can().chain().focus().toggleBold().run(),
                active: editor.isActive("bold"),
                title: "加粗",
                Icon: IconBold,
            })}
            {menuItem({
                onClick: () => editor.chain().focus().toggleTaskList().run(),
                disabled: false,
                active: editor.isActive("taskList"),
                title: "任务列表",
                Icon: IconListDetails,
            })}
        </div>
    )
}

export default (props) => {
    const { event, content } = props

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                protocols: ["ftp", "mailto"],
                autolink: false,
            }),
            // Image,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            debouncedRun(editor);
        },
    });

    const { run: debouncedRun } = useDebounceFn((content) => {
        event.emit(content)
    }, { wait: 50 })

    React.useEffect(() => {
        if (editor) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    React.useEffect(() => {

        if (editor && editor.isEmpty) {
            setTimeout(() => {
                editor.commands.focus('end');
            }, 300);
        }


        return () => {
            if (editor) {
                editor.destroy()
            }
        }
    }, [editor])

    return (
        <div className={"sn-small-editor"}>
            {editor && <MenuBar editor={editor} />}
            <EditorContent
                editor={editor}
            />
        </div>
    );
};
