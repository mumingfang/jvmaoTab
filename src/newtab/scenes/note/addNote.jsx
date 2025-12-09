import React from "react";
import { observer } from "mobx-react";
import { Button, Checkbox, Modal, Input } from "antd";
import useStores from "~/hooks/useStores";
import Editor from "~/components/Editor";
import { useMemoizedFn, useEventEmitter, useDebounceFn } from "ahooks";
import styled from "styled-components";

const Warp = styled.div`
    height: 100%;
`;

const AddNote = (props) => {
    const { refresh, noteType } = props
    const { note, tools } = useStores();
    const [text, setText] = React.useState('');
    const editorEvent$ = useEventEmitter();

    const { run: debouncedRun } = useDebounceFn(() => {
        refresh();
    }, { wait: 500 })

    editorEvent$.useSubscription((editor) => {
        try {
            if (editor.isEmpty) {
                if (note.openId > 0) {
                    note.delectNote(note.openId).then(() => {
                        refresh();
                        note.openId = 0;
                    }).catch((err) => {
                        console.error("删除空便签失败:", err);
                        tools.error('删除便签失败');
                    });
                }
            } else {
                const html = editor.getHTML();
                if (note.openId > 0) {
                    note.updateNote(note.openId, {
                        content: html
                    }).then(() => {
                        debouncedRun();
                    }).catch((err) => {
                        console.error("更新便签失败:", err);
                        tools.error('更新便签失败');
                    });
                } else if (note.openId === 0) {
                    note.addNote({
                        content: html,
                        state: noteType
                    }).then((res) => {
                        if (res != null) {
                            note.open(res);
                        }
                        refresh();
                    }).catch((err) => {
                        console.error("添加便签失败:", err);
                        tools.error('添加便签失败');
                    });
                }
            }
        } catch (error) {
            console.error("编辑器事件处理失败:", error);
            tools.error('操作失败，请重试');
        }
    });

    React.useEffect(() => {
        if (note.openId > 0) {
            note.findNote(note.openId).then((res) => {
                if (res) {
                    setText(res.content || '');
                } else {
                    setText('');
                }
            }).catch((err) => {
                if (err.name === "DatabaseClosedError") {
                    window.location.reload();
                    return;
                }
                tools.error('获取便签失败');
                console.error("findNote", err);
                setText('');
            });
        } else if (note.openId === 0) {
            setText('');
        }
    }, [note.openId, note, tools])

    return (
        <Warp >
            <Editor event={editorEvent$} content={text} />
        </Warp>
    );
};
export default observer(AddNote);
