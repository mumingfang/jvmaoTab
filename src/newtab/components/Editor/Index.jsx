import React from "react";
import { EditorProvider, EditorContent, useCurrentEditor, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import StarterKit from "@tiptap/starter-kit";
import MenuBar from "./MenuBar";
import Image from "./image";
import { useDebounceFn } from "ahooks";
import "./index.scss";


export default (props) => {
  const { event, content } = props

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        protocols: ["ftp", "mailto"],
        autolink: false,
      }),
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      debouncedRun(editor);
    },
    enableCoreExtensions: {
      tabindex: false
    }
  });

  const { run: debouncedRun } = useDebounceFn((content) => {
    event.emit(content)
  }, { wait: 50 })

  React.useEffect(() => {
    if (editor) {
      console.log('%c XJ - [ editor ]-44-「Index.jsx」', 'font-size:13px; background:#f8f53d; color:#000;', editor);
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  React.useEffect(() => {
    
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  return (
    <div className={"sn-editor"} >
      {editor && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
      />
    </div>
  );
};
