import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import styled from "styled-components";
import { DndContext } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { AnimatePresence } from 'framer-motion';
import HomeNoteItem from "~/scenes/note/homeNoteItem";
import { IconSettings, IconInfoCircle, IconDownload } from "@tabler/icons-react";
import { useMemoizedFn, useLongPress } from 'ahooks';
import _ from "lodash";

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

const HomeNote = (props) => {
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
        // div的尺寸
        const divWidth = 240;
        const divHeight = 240;

        // 屏幕尺寸
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // 鼠标点击位置
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // 计算div左上角的位置
        let left = mouseX - divWidth / 2;
        let top = mouseY - divHeight / 2;

        // 确保div不会超出屏幕边缘
        if (left < 0) {
            left = 0;
        } else if (left + divWidth > screenWidth) {
            left = screenWidth - divWidth;
        }

        if (top < 0) {
            top = 0;
        } else if (top + divHeight > screenHeight) {
            top = screenHeight - divHeight;
        }

        note.addSticky({ top, left });

    }, [])

    const saveNotePosition = useMemoizedFn((key, left, top) => {
        if (!v.canSaveNotePosition) {
            return;
        }
        console.log('%c [ saveNotePosition ]-80', 'font-size:13px; background:pink; color:#bf2c9f;')
        const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
        newData.forEach((v) => {
            if (v.key == key) {
                v.left = left;
                v.top = top;
            }
        })
        option.setItem('homeNoteData', newData, false);
    }, [v.canSaveNotePosition])

    const saveNoteId = useMemoizedFn((key, id, remove = false) => {
        console.log('%c [ saveNoteId ]-80', 'font-size:13px; background:pink; color:#bf2c9f;')
        const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
        newData.forEach((v) => {
            if (v.key == key) {
                v.id = remove ? 0 : id;
            }
        })

        option.setItem('homeNoteData', newData, false);
    }, [])

    const removeNote = useMemoizedFn((key) => {
        note.removeSticky(key);
    });


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
        if (option.item.bgType == "bing") {
            list.push({
                type: 'divider',
            })
            list.push({
                label: "Bing 壁纸下载",
                icon: <IconDownload />,
                key: "downloadBing",
                onClick: () => {
                    window.open(home.bgUrl, '_blank');
                },
            })
        }

        tools.setRightClickEvent(e, list);
    }, []);


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
                setShow(false)
                setTimeout(() => {
                    v.canSaveNotePosition = true
                }, 200);
            }, 500);
        } else {
            setShow(true)
            v.canSaveNotePosition = false
        }
    }, [stickled])


    return (
        <Wrap zIndex={stickled ? -1 : 20} onDoubleClick={onDoubleClick} >
            <DndContext autoScroll={false} modifiers={[restrictToParentElement]}>
                <DndContextWrap className="sn-bg-wrap" data-type="bg-root" ref={parentRef} onContextMenu={(e) => onContextMenu(e)}>
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
                                zIndex={activeID == v.key ? 10 : 5}
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

export default observer(HomeNote);
