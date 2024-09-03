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
    const { note, tools } = useStores();
    const { refresh } = props
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
                    })
                }
            } else {
                const html = editor.getHTML();
                if (note.openId > 0) {
                    note.updateNote(note.openId, {
                        content: html
                    }).then(() => {
                        debouncedRun();
                    })
                } else if (note.openId === 0) {
                    note.addNote({
                        content: html,
                    }).then((res) => {
                        note.open(res);
                        refresh();
                    })
                }
            }
        } catch (error) {
            console.log('%c [ error ]-52', 'font-size:13px; background:pink; color:#bf2c9f;', error)
        }
    });

    React.useEffect(() => {
        if (note.openId > 0) {
            note.findNote(note.openId).then((res) => {
                if (res) {
                    setText(res.content);
                }
            }).catch((err) => {
                if (err.name === "DatabaseClosedError") {
                    window.location.reload();
                  }
                tools.error('获取便签失败');
                console.error("findNote", err);
            })
        } else if (note.openId === 0) {
            setText('');
        }
    }, [note.openId])

    return (
        <Warp >
            <Editor event={editorEvent$} content={text} />
        </Warp>
    );
};
export default observer(AddNote);
