import React from "react";
import styled from "styled-components";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { useDraggable } from "@dnd-kit/core";
import { useDebounceFn, useEventEmitter, useUpdateEffect } from "ahooks";
import { Button, Tooltip } from "antd";
import { IconDots, IconX, IconCapsuleHorizontal } from "@tabler/icons-react";
import Editor from "~/components/Editor/small";
import { motion } from "framer-motion";
import dayjs from 'dayjs'

const _height = 22;

const Wrap = styled.div`
    position: absolute;
    transform: translate3d(var(--j-x), var(--j-y), 0);
    left: var(--j-left);
    top: var(--j-top);
    border-radius: 2px;
    &:hover {
        .noteHeader svg{
            opacity: 1;
        }
        .closeBtn {
            opacity: 1;
        }
    }

    &.loading {
        -webkit-user-select: none !important;
        -moz-user-select: none !important; 
        -ms-user-select: none !important; 
        user-select: none !important; 
    }
`;
const MotionWrap = styled(motion.div)`
`;
const NoteWrap = styled.div`
    --j-scale: 1;
    position: relative;
    width: 240px;
    min-height: 240px;
    background-color: var(--fff);
    box-shadow: rgba(0, 0, 0, 0.3)  4px 6px 12px -5px;
    transform: scale(var(--j-scale));
    transition: transform 250ms ease, box-shadow 250ms ease;
    &.dragging {
        --j-scale: 1.02;
        z-index: 100;
        box-shadow: rgba(0, 0, 0, 0.2)  11px 20px 20px -8px;
    }
`;
const NoteHeader = styled.div`
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
    background-color: var(--notebrHomeHeaderBg);
    box-sizing: border-box;
    height: ${_height}px;
    border-bottom: 1px solid var(--notebrColor);
    cursor: move;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #666;
    svg {
        ttansition: opacity 0.3s;
        opacity: 0;
    }
`
const CloseBtn = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    z-index: 3;
    top: 0;
    right: 0;
    ttansition: opacity 0.3s;
        opacity: 0;
`;
const Tentacle = styled.div`
    position: absolute;
    bottom: 0;
    &.left{
        width: 4px;
        height: 100%;
        left: 0;
        transform: translateX(-4px);
    }
    &.right{
        width: 4px;
        height: 100%;
        right: 0;
        transform: translateX(4px);
    }
    &.bottom{
        width: 100%;
        height: 4px;
        bottom: 0;
        transform: translateY(4px);
    }
`;
const TimeCapsule = styled.div`
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background-color: var(--fff);
    box-shadow: rgba(0, 0, 0, 0.3)  4px 6px 12px -5px;
    transform: scale(var(--j-scale));
    transition: transform 250ms ease, box-shadow 250ms ease;
    &.dragging {
        --j-scale: 1.02;
        z-index: 100;
        box-shadow: rgba(0, 0, 0, 0.2)  11px 20px 20px -8px;
    }
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
`;

const animations = {
    show: {
        y: "0%",
        scale: 1,
        opacity: 1,
        transition: { duration: 0.12, ease: "easeOut" },
    },
    hidden: {
        y: "20%",
        opacity: 0,
        scale: 0.5,
        transition: { duration: 0.2, ease: "linear" },
    }
};

const HomeNoteItem = (props) => {
    const { tools, note } = useStores();
    const { left = 0, top = 0, id, kId, type, time, zIndex, onClick, saveNotePosition, saveNoteId, removeNote } = props;
    const [position, setPosition] = React.useState({ x: left, y: top });
    const [transformPosition, setTransformPosition] = React.useState({ x: 0, y: 0 });
    const [text, setText] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [showCapsule, setShowCapsule] = React.useState(false);

    const v = React.useRef({
        id,
    }).current;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: "draggable_" + kId,
    });

    const editorEvent$ = useEventEmitter();

    editorEvent$.useSubscription((editor) => {
        try {
            if (editor.isEmpty) {
                note.delectNote(v.id).then(() => {
                    saveNoteId(kId, v.id, true);
                })
            } else {
                const html = editor.getHTML();
                if (v.id > 0) {
                    note.updateNote(v.id, {
                        content: html
                    })
                } else if (v.id === 0) {
                    note.addNote({
                        content: html,
                    }).then((res) => {
                        v.id = res;
                        saveNoteId(kId, res);
                    })
                }
            }
        } catch (error) {
            console.log('%c [ error ]-52', 'font-size:13px; background:pink; color:#bf2c9f;', error)
        }
    });

    const { run: debouncedRun } = useDebounceFn((x, y) => {
        setPosition({ x: x + position.x, y: y + position.y });
        setTransformPosition({ x: 0, y: 0 });
        saveNotePosition(kId, x + position.x, y + position.y);
    }, { wait: 100 })

    const onContextMenu = React.useCallback((e, id) => {
        e.stopPropagation();
        e.preventDefault();
        tools.setRightClickEvent(e, [
            {
                label: "时间胶囊 - 周",
                icon: <IconCapsuleHorizontal />,
                disabled: !v.id,
                key: "del-group",
                onClick: () => note.setTimeCapsule(kId),
            },
            {
                label: "时间胶囊 - 月",
                icon: <IconCapsuleHorizontal />,
                disabled: !v.id,
                key: "del-group",
                onClick: () => note.setTimeCapsule(kId, 'month'),
            },
            {
                label: "时间胶囊 - 半年",
                icon: <IconCapsuleHorizontal />,
                disabled: !v.id,
                key: "del-group",
                onClick: () => note.setTimeCapsule(kId, 'half-year'),
            },
            {
                label: "时间胶囊 - 年",
                icon: <IconCapsuleHorizontal />,
                disabled: !v.id,
                key: "del-group",
                onClick: () => note.setTimeCapsule(kId, 'year'),
            },
        ]);
    }, []);

    React.useEffect(() => {
        if (v.id > 0) {
            note.findNote(v.id).then((res) => {
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
        } else if (v.id === 0) {
            setText('');
        }

        setTimeout(() => {
            setLoading(false);
        }, 200);
    }, [])

    React.useEffect(() => {
        if (transform) {
            setTransformPosition({
                x: transform.x,
                y: transform.y,
            });
        } else {
            debouncedRun(transformPosition.x, transformPosition.y);
        }
    }, [transform]);

    React.useEffect(() => {
        if (type == 'capsule' && time && dayjs().isAfter(time)) {
            setShowCapsule(true);
        }
    }, [type, time])

    if (type == 'capsule' && !showCapsule) {
        return null;
    }

    return (
        <Wrap
            className={loading ? "loading" : ""}
            ref={setNodeRef}
            {...attributes}
            onClick={onClick}
            style={{
                zIndex,
                "--j-x": `${transformPosition.x}px`,
                "--j-y": `${transformPosition.y}px`,
                "--j-left": `${position.x}px`,
                "--j-top": `${position.y}px`,
            }}
        >
            {showCapsule ? (
                <MotionWrap initial="hidden" animate="show" exit="hidden" variants={animations}>
                    <TimeCapsule onClick={() => {
                        note.openTimeCapsule(kId);
                        setShowCapsule(false);
                    }}>
                        <IconCapsuleHorizontal size={20} stroke={1.4} />
                    </TimeCapsule>
                </MotionWrap>
            ) : (
                <MotionWrap initial="hidden" animate="show" exit="hidden" variants={animations}>
                    <NoteWrap className={isDragging ? "dragging" : ""}>
                        <NoteHeader className="noteHeader" {...listeners} onContextMenu={(e) => onContextMenu(e)}>
                            <IconDots size={16} />
                        </NoteHeader>
                        <CloseBtn
                            className="closeBtn"
                            onClick={() => removeNote(kId)}
                            size="small"
                            type={"text"}
                            icon={<IconX size={16} stroke={1.4} />}
                        />
                        <Editor event={editorEvent$} content={text} />
                        <Tentacle className="left" {...listeners} />
                        <Tentacle className="right" {...listeners} />
                        <Tentacle className="bottom" {...listeners} />
                    </NoteWrap>
                </MotionWrap>
            )}

        </Wrap>
    );
}

export default observer(HomeNoteItem);
