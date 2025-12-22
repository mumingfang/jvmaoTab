import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import styled from "styled-components";
import { DndContext } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { AnimatePresence } from 'framer-motion';
import HomeNoteItem from "~/scenes/note/homeNoteItem";
import { IconSettings, IconInfoCircle, IconDownload, IconRefresh } from "@tabler/icons-react";
import { useMemoizedFn, useLongPress } from 'ahooks';
import _ from "lodash";

// 常量定义
const NOTE_WIDTH = 240;
const NOTE_HEIGHT = 240;
const POSITION_SAVE_DELAY = 200; // 位置保存延迟（毫秒）
const SHOW_DELAY = 500; // 显示延迟（毫秒）
const MAX_STICKY_NOTES = 5; // 最大便签数量

const Wrap = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transition: all 0.3s;
    z-index: ${(props) => props.zIndex};
`;

const DndContextWrap = styled.div`
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    z-index: 5;
`;

const HomeNoteComponent = (props) => {
    const { stickled } = props
    const { home, option, note, tools } = useStores();
    const { homeNoteData } = option.item;
    const [activeID, setActiveID] = React.useState(null);

    const [show, setShow] = React.useState(false);
    const parentRef = React.useRef(null);

    const v = React.useRef({
        canSaveNotePosition: false,
    }).current;

    const onDoubleClick = useMemoizedFn((e) => {
        if (!e.target.classList.contains("sn-bg-wrap")) {
            return;
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // 计算div左上角的位置（居中显示）
        let left = mouseX - NOTE_WIDTH / 2;
        let top = mouseY - NOTE_HEIGHT / 2;

        // 确保div不会超出屏幕边缘
        left = Math.max(0, Math.min(left, screenWidth - NOTE_WIDTH));
        top = Math.max(0, Math.min(top, screenHeight - NOTE_HEIGHT));

        note.addSticky({ top, left });
    }, [note])

    const saveNotePosition = useMemoizedFn((key, left, top) => {
        if (!v.canSaveNotePosition) {
            return;
        }
        const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
        newData.forEach((item) => {
            if (item.key === key) {
                item.left = left;
                item.top = top;
            }
        });
        option.setItem('homeNoteData', newData, false);
    }, [v.canSaveNotePosition, homeNoteData, option])

    const saveNoteId = useMemoizedFn((key, id, remove = false) => {
        const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
        newData.forEach((item) => {
            if (item.key === key) {
                item.id = remove ? 0 : id;
            }
        });
        option.setItem('homeNoteData', newData, false);
    }, [homeNoteData, option])

    const removeNote = useMemoizedFn((key) => {
        note.removeSticky(key);
    }, [note]);


    const onContextMenu = React.useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();
        const list = [
            {
                label: "首选项",
                icon: <IconSettings />,
                key: "preferences",
                onClick: () => {
                    tools.preferencesOpen = true;
                },
            },
            {
                label: "关于",
                icon: <IconInfoCircle />,
                key: "about",
                onClick: () => {
                    tools.openPublicModal("Manual", {}, '90vw');
                },
            },
        ];
        if (option.item.bgType === "bing") {
            list.push({
                type: 'divider',
            });
            list.push({
                label: "Bing 壁纸下载",
                icon: <IconDownload />,
                key: "downloadBing",
                onClick: () => {
                    window.open(home.bgUrl, '_blank');
                },
            });
            list.push({
                label: "随机换一张 Bing 壁纸",
                icon: <IconRefresh />,
                key: "randomBing",
                onClick: () => {
                    home.randomBingBg && home.randomBingBg();
                },
            });
        }

        tools.setRightClickEvent(e, list);
    }, [tools, option, home]);


    // 长按
    useLongPress((e) => {
        if (!e.target.classList.contains("sn-bg-wrap")) {
            return;
        }

        if (!stickled) {
            home.showBg2();
            setShow(true);
        }
    }, parentRef, {
        moveThreshold: { x: 30, y: 30 },
        onLongPressEnd: () => {
            home.showBg1();
            setShow(false);
        }
    });

    React.useEffect(() => {
        if (!stickled) {
            setTimeout(() => {
                setShow(false);
                setTimeout(() => {
                    v.canSaveNotePosition = true;
                }, POSITION_SAVE_DELAY);
            }, SHOW_DELAY);
        } else {
            setShow(true);
            v.canSaveNotePosition = false;
        }
    }, [stickled])


    return (
        <Wrap zIndex={stickled ? -1 : 20} onDoubleClick={onDoubleClick} >
            <DndContext autoScroll={false} modifiers={[restrictToParentElement]} tabIndex="-1">
                <DndContextWrap className="sn-bg-wrap" data-type="bg-root"  ref={parentRef} onContextMenu={(e) => onContextMenu(e)}>
                    <AnimatePresence>
                        {!show && (homeNoteData || []).map((v) => {
                            return <HomeNoteItem
                                key={v.key}
                                left={v.left}
                                top={v.top}
                                id={v.id}
                                kId={v.key}
                                type={v.type}
                                time={v.time}
                                zIndex={activeID === v.key ? 10 : 5}
                                saveNotePosition={saveNotePosition}
                                saveNoteId={saveNoteId}
                                removeNote={removeNote}
                                onClick={() => {
                                    setActiveID(v.key)
                                }}
                            />
                        })}
                    </AnimatePresence>
                </DndContextWrap>
            </DndContext>
        </Wrap>
    );
}

const HomeNote = React.memo(observer(HomeNoteComponent));

export default HomeNote;
