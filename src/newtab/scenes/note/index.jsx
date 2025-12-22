import React from "react";
import { Col, Row, theme, Typography, Button, Tooltip, Popconfirm, Checkbox, Space } from "antd";
import { observer } from "mobx-react";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import { useMemoizedFn, useVirtualList, useRequest, useSelections, useUpdateEffect, useDebounceEffect } from "ahooks";
import AddNote from "~/scenes/note/addNote";
import TextOnlyComponent from "~/components/TextOnlyComponent";
import { headerHeight } from "~/view/Home";
import { IconTrashX, IconEditCircle, IconSelect, IconX, IconDeviceDesktop, IconDeviceDesktopX } from "@tabler/icons-react";
import { motion } from 'framer-motion';
import dayjs from 'dayjs'
import { lighten } from 'polished';

const { useToken } = theme;

const RowWrap = styled(Row)`
  min-height: calc(100vh - ${headerHeight}px);
  background-color: var(--fff);
`;
const Left = styled(Col)`
    &:after{
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        transform: translateX(100%);
        width: 20px;
        height: 100%;
        box-shadow: var(--notebrBoxShadow) 16px 0px 20px -10px inset;
        z-index: 10;
        border-right: 1px solid var(--notebrColor);
    }
`;
const Rtight = styled(Col)`
    transition: all 0.3s;
    border-left: 1px solid var(--borderColor);
`;
const ListHeader = styled.div`
    height: 50px;
    border-bottom: 1px solid var(--notebrColor);
    box-sizing: border-box;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;
const Container = styled.div`
 height: calc(100vh - ${headerHeight + 50}px);
 overflow-y: auto;
`;
const Item = styled(motion.div)`
    cursor: pointer;
    height: 50px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--notebrColor);
    padding: 0 20px;
    display: flex;
    .left {
        display: flex;
        justify-content: center;
        align-items: center;
        .ant-checkbox {
            margin-right: 10px;
        }
    }
    .right {
        flex: 1;
        width: 0;
        position: relative;
        .sticky {
            position: absolute;
            top: 50%;
            right: 4px;
            transform: translateY(-50%);
            color: var(--fff);
            background-color: ${(props) => lighten(0.2, props.colorPrimary)};
            width: 24px;
            height: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%; 
        }
    }
    &.active {
        background-color: ${(props) => (props.colorPrimaryBg)};
        .ant-typography {
            color: ${(props) => lighten(0.2, props.colorPrimary)};
        }
        time {
            color: ${(props) => lighten(0.3, props.colorPrimary)};
        }
        .right {
            .sticky {
                color: ${(props) => lighten(0.2, props.colorPrimary)};
                background-color: var(--fff);
            }
        }
    }
`;
const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0 0;
    time {
        font-size: 12px;
        color: #666;
    }
`;
const ItemContent = styled(Typography.Text)`
    font-size: 14px;
    color: #444;
`;
const RightBtnWrap = styled.div`
    display: flex;
    height: 50px;
    align-items: center;
    position: absolute;
    top: 0;
    right: 20px;
`;
const BtnSelect = styled(Button)`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    color: #666;
`;
const BtnSelectItem = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
`;
const BtnAdd = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
`;
const BtnDel = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
`;

// 新div的大小
const divWidth = 240;
const divHeight = 240;

// 检查新div的位置是否与现有div重叠
function checkOverlap(newLeft, newTop, existingDivs) {
    if (!Array.isArray(existingDivs)) {
        return false;
    }
    return existingDivs.some(div => {
        if (!div || typeof div.left !== 'number' || typeof div.top !== 'number') {
            return false;
        }
        return newLeft < div.left + divWidth &&
            newLeft + divWidth > div.left &&
            newTop < div.top + divHeight &&
            newTop + divHeight > div.top;
    });
}

// 寻找新div的位置
function findPositionForNewDiv(existingDivs, startLeft = 70, startTop = 70) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let left = startLeft;
    let top = startTop;
    const maxIterations = Math.ceil((screenWidth / divWidth) * (screenHeight / divHeight)) + 100;
    let iterations = 0;
    
    while (iterations < maxIterations) {
        iterations++;
        if (!checkOverlap(left, top, existingDivs)) {
            if (left + divWidth <= screenWidth && top + divHeight <= screenHeight) {
                return { left, top };
            }
        }
        left += divWidth; // 横向移动
        if (left + divWidth > screenWidth) { // 超出屏幕宽度，纵向移动并重置横坐标
            left = startLeft;
            top += divHeight;
        }
        if (top + divHeight > screenHeight) { // 超出屏幕高度，无法放置新div
            throw new Error("没有足够的空间放置新的div");
        }
    }
    
    // 如果达到最大迭代次数仍未找到位置，抛出错误
    throw new Error("无法找到合适的位置放置新的div，请尝试移除一些便签");
}

const NoteHome = (props) => {
    const { tools, note, option } = useStores();
    const { token } = useToken();
    const [selectOpen, setSelectOpen] = React.useState(false);
    const [stickyIds, setStickyIds] = React.useState([]);
    const [noteType, setNoteType] = React.useState(1);

    const containerRef = React.useRef(null);
    const wrapperRef = React.useRef(null);

    const getNote = useMemoizedFn(() => {
        return note.getNote(1, 9999, noteType).then((res) => {
            return res?.list || [];
        }).catch((err) => {
            console.error("获取便签列表失败:", err);
            tools.error('获取便签列表失败');
            return [];
        });
    }, [noteType, note, tools]);

    const { data, error, refresh, run } = useRequest(getNote, {
        manual: true,
    });

    const onEdit = useMemoizedFn((id) => {
        if (id != null) {
            note.open(id);
        }
    }, [note]);

    const onDelete = useMemoizedFn((ids) => {
        if (!ids || (Array.isArray(ids) && ids.length === 0)) {
            return;
        }
        note.delectNote(ids).then(() => {
            refresh();
            note.openId = -1;
            if (selectOpen) {
                setSelectOpen(false);
            }
        }).catch((err) => {
            console.error("删除便签失败:", err);
            tools.error('删除便签失败');
        });
    }, [selectOpen, note, refresh, tools])

    const updateIds = useMemoizedFn(() => {
        const { homeNoteData } = option.item;
        const ids = (homeNoteData || []).map((v) => v?.id).filter(id => id != null) || [];
        setStickyIds(ids);
    }, [option]);

    const originalList = React.useMemo(() => {
        return Array.from(data || []);
    }, [data]);


    const selectList = React.useMemo(() => {
        return (data || []).map((v) => v?.id).filter(id => id != null);
    }, [data]);

    const [list] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 50,
        overscan: 10,
    });

    const { selected, allSelected, isSelected, toggle, toggleAll, partiallySelected } = useSelections(selectList);

    const onContextMenu = React.useCallback((e, id) => {
        if (!id) return;
        e.stopPropagation();
        e.preventDefault();
        const isSticky = stickyIds?.includes(id);
        tools.setRightClickEvent(e, [
            {
                label: isSticky ? '从首屏移除' : "贴在首屏",
                icon: isSticky ? <IconDeviceDesktopX /> : <IconDeviceDesktop />,
                key: "sticky",
                onClick: () => {
                    if (isSticky) {
                        note.removeSticky(id, true);
                    } else {
                        try {
                            const { homeNoteData } = option.item;
                            const newDivPosition = findPositionForNewDiv(homeNoteData || []);
                            note.addSticky({ id, left: newDivPosition.left, top: newDivPosition.top });
                        } catch (error) {
                            console.error("添加便签到首屏失败:", error);
                            tools.error(error.message || '添加便签到首屏失败');
                        }
                    }

                    setTimeout(() => {
                        updateIds();
                    }, 200);
                },
            },
            {
                label: "删除便签",
                icon: <IconTrashX />,
                key: "delete",
                onClick: () => {
                    onDelete([id]);
                },
            },
        ]);
    }, [stickyIds, tools, note, option, updateIds, onDelete]);

    useUpdateEffect(() => {
        if (note.openId === -1) {
            if (list?.length && list[0]?.data?.id != null) {
                note.open(list[0].data.id);
            } else {
                note.open(0);
            }
        }
    }, [list, note]);

    useUpdateEffect(() => {
        run();
        updateIds();
    }, [noteType, run, updateIds]);

    React.useEffect(() => {
        if (note.activeTabKey) {
            const parts = `${note.activeTabKey}`.split('_');
            if (parts.length >= 2) {
                const id = parts[1];
                const numId = Number(id);
                if (!isNaN(numId)) {
                    setNoteType(numId);
                    note.open(-1);
                }
            }
        }
    }, [note.activeTabKey, note]);

    useDebounceEffect(
        () => {
            note.open();
            setTimeout(() => {
                refresh();
                updateIds();
            }, 0);
        },
        [tools.timeKey],
        {
            wait: 10,
        },
    );

    return (
        <RowWrap className="sn-bg-wrap" >
            <Left span={7}>
                <ListHeader>
                    <div className="left">
                        {selectOpen ? (
                            <Space>
                                <Checkbox checked={allSelected} onClick={toggleAll} indeterminate={partiallySelected} tabIndex={-1}>
                                    全选
                                </Checkbox>
                                <Popconfirm
                                    placement="bottomRight"
                                    title={"确认删除该便签吗?"}
                                    onConfirm={() => onDelete(selected)}
                                    okText="确定"
                                    cancelText="取消"
                                    disabled={selected.length === 0}
                                >
                                    <BtnSelectItem tabIndex={-1} danger disabled={selected.length === 0} size="small" icon={<IconTrashX size={16} stroke={1.4} />} >删除</BtnSelectItem>
                                </Popconfirm>
                                <BtnSelectItem tabIndex={-1} size="small" icon={<IconX size={16} stroke={1.4} />} onClick={() => setSelectOpen(false)}>取消</BtnSelectItem>
                            </Space>
                        ) : (
                            <Tooltip placement="top" title={"批量删除"}>
                                <BtnSelect tabIndex={-1} type="link" disabled={selectList.length === 0} icon={<IconSelect size={18} stroke={1.4} />} onClick={() => setSelectOpen(true)}></BtnSelect>
                            </Tooltip>
                        )}
                    </div>
                    <div className="right">
                        <Tooltip placement="top" title={"新增便签"}>
                            <BtnAdd tabIndex={-1} icon={<IconEditCircle size={18} stroke={1.4} />} onClick={() => { note.open(0) }}></BtnAdd>
                        </Tooltip>
                    </div>
                </ListHeader>
                <Container ref={containerRef} className="scroll-container">
                    <div ref={wrapperRef}>
                        {note.openId === 0 ? (
                            <Item
                                className="active"
                                colorPrimaryBg={token.colorPrimaryBg}
                                colorPrimary={token.colorPrimary}
                            >
                                <div className="right">
                                    <ItemHeader>
                                        <time>{dayjs().format('YYYY年MM月DD日 HH:mm')}</time>
                                    </ItemHeader>
                                    <ItemContent ellipsis>新建便签</ItemContent>
                                </div>
                            </Item>
                        ) : null}
                        {(list || []).map((v) => {
                            const itemId = v.data?.id;
                            if (itemId == null) return null;
                            return (
                                <Item
                                    key={itemId}
                                    onClick={() => onEdit(itemId)}
                                    className={itemId === note.openId ? 'active' : ''}
                                    colorPrimaryBg={token.colorPrimaryBg}
                                    colorPrimary={token.colorPrimary}
                                    onContextMenu={(e) => onContextMenu(e, itemId)}
                                >
                                    <div className="left">
                                        {selectOpen ? <Checkbox checked={isSelected(itemId)} onClick={() => toggle(itemId)} /> : null}
                                    </div>
                                    <div className="right">
                                        <ItemHeader>
                                            <time>{v.data?.updateTime ? dayjs(v.data.updateTime).format('YYYY年MM月DD日 HH:mm') : ''}</time>
                                        </ItemHeader>
                                        <ItemContent ellipsis><TextOnlyComponent content={v.data?.content || ''} /></ItemContent>
                                        {stickyIds.includes(itemId) ? (
                                            <div className="sticky">
                                                <IconDeviceDesktop size={14} stroke={1.8} />
                                            </div>
                                        ) : null}
                                    </div>
                                </Item>
                            );
                        })}
                    </div>
                </Container>
            </Left>
            <Rtight span={17}>
                <RightBtnWrap>
                    {note.openId > 0 ? (
                        <Popconfirm
                            placement="bottomRight"
                            title={"确认删除该便签吗?"}
                            onConfirm={() => onDelete([note.openId])}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Tooltip placement="top" title={"删除便签"}>
                                <BtnDel tabIndex={-1} danger type="text" icon={<IconTrashX size={20} stroke={1.4} />}></BtnDel>
                            </Tooltip>
                        </Popconfirm>
                    ) : null}
                </RightBtnWrap>
                <AddNote refresh={refresh} noteType={noteType} />
            </Rtight>
        </RowWrap>
    );
};

export default observer(NoteHome);
