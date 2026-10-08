import React from "react";
import styled from "styled-components";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { useDraggable } from "@dnd-kit/core";
import { useDebounceFn, useEventEmitter, useUpdateEffect, useMemoizedFn } from "ahooks";
import { Button, Tooltip } from "antd";
import { IconDots, IconX, IconCapsuleHorizontal } from "@tabler/icons-react";
import Editor from "~/components/Editor/small";
import { motion } from "framer-motion";
import dayjs from 'dayjs'

const _height = 22;
// 便签的默认尺寸，测不到真实尺寸时用它兜底
const DEFAULT_NOTE_SIZE = 240;

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
        transition: opacity 0.3s;
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
    transition: opacity 0.3s;
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

    const wrapRef = React.useRef(null);
    const positionRef = React.useRef(position);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: "draggable_" + kId,
    });

    // dnd-kit 的 ref 和自己测尺寸用的 ref 都要指向同一个节点
    const setRefs = useMemoizedFn((node) => {
        wrapRef.current = node;
        setNodeRef(node);
    });

    // 把坐标限制在当前视口内。位置是创建时算好后长期存盘的，
    // 换分辨率 / 缩放 / 改窗口大小之后就会越界，必须重新收敛，
    // 否则编辑器聚焦时会把外层容器滚走，整个首屏错位
    const clampPosition = useMemoizedFn((x, y) => {
        const width = wrapRef.current?.offsetWidth || DEFAULT_NOTE_SIZE;
        const height = wrapRef.current?.offsetHeight || DEFAULT_NOTE_SIZE;
        const maxLeft = Math.max(0, window.innerWidth - width);
        const maxTop = Math.max(0, window.innerHeight - height);
        return {
            x: Math.min(Math.max(0, x), maxLeft),
            y: Math.min(Math.max(0, y), maxTop),
        };
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
                        state: note.getTopNoteTabId(),
                    }).then((res) => {
                        v.id = res;
                        saveNoteId(kId, res);
                    })
                }
            }
        } catch (error) {
            console.error('编辑器事件处理失败:', error)
        }
    });

    const { run: debouncedRun } = useDebounceFn((x, y) => {
        const next = clampPosition(x + positionRef.current.x, y + positionRef.current.y);
        positionRef.current = next;
        setPosition(next);
        saveNotePosition(kId, next.x, next.y);
        setTransformPosition({ x: 0, y: 0 });
    }, { wait: 100 });

    // 挂载时和视口变化时把越界的便签拉回可视区域
    const resetToViewport = useMemoizedFn(() => {
        const prev = positionRef.current;
        const next = clampPosition(prev.x, prev.y);
        if (next.x === prev.x && next.y === prev.y) {
            return;
        }
        positionRef.current = next;
        setPosition(next);
        // 视口变化只调整当前页面的显示；用户拖动时才保存并同步坐标。
    });

    const onContextMenu = React.useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();
        const timeCapsuleOptions = [
            { label: "时间胶囊 - 周", timeType: "week" },
            { label: "时间胶囊 - 月", timeType: "month" },
            { label: "时间胶囊 - 半年", timeType: "half-year" },
            { label: "时间胶囊 - 年", timeType: "year" },
        ];
        
        tools.setRightClickEvent(e, timeCapsuleOptions.map((option) => ({
            label: option.label,
            icon: <IconCapsuleHorizontal />,
            disabled: !v.id,
            key: `capsule-${option.timeType}`,
            onClick: () => note.setTimeCapsule(kId, option.timeType),
        })));
    }, [tools, note, kId, v.id]);

    React.useEffect(() => {
        if (v.id > 0) {
            note.findNote(v.id).then((res) => {
                if (res) {
                    setText(res.content);
                }
            }).catch((err) => {
                if (err.name === "DatabaseClosedError") {
                    window.location.reload();
                    return;
                }
                tools.error('获取便签失败');
                console.error("findNote", err);
            });
        } else if (v.id === 0) {
            setText('');
        }

        const timer = setTimeout(() => {
            setLoading(false);
        }, 200);
        
        return () => clearTimeout(timer);
    }, [v.id, note, tools])

    React.useEffect(() => {
        if (transform) {
            setTransformPosition({
                x: transform.x,
                y: transform.y,
            });
        } else {
            debouncedRun(transformPosition.x, transformPosition.y);
        }
    }, [transform, debouncedRun]);

    React.useEffect(() => {
        if (type === 'capsule' && time && dayjs().isAfter(time)) {
            setShowCapsule(true);
        }
    }, [type, time]);

    React.useEffect(() => {
        positionRef.current = position;
    }, [position]);

    React.useEffect(() => {
        // 延迟一点等内容加载完、高度定下来再收敛
        const timer = setTimeout(resetToViewport, 300);
        window.addEventListener("resize", resetToViewport);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", resetToViewport);
        };
    }, [resetToViewport]);

    if (type === 'capsule' && !showCapsule) {
        return null;
    }

    return (
        <Wrap
            className={loading ? "loading" : ""}
            ref={setRefs}
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
                            tabIndex="-1"
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
