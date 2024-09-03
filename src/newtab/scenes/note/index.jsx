import React from "react";
import { Col, Row, theme, Typography, Button, Tooltip, Popconfirm, Checkbox, Space } from "antd";
import { observer } from "mobx-react";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import { useMemoizedFn, useVirtualList, useRequest, useSelections, useUpdateEffect } from "ahooks";
import AddNote from "~/scenes/note/addNote";
import TextOnlyComponent from "~/components/TextOnlyComponent";
import { headerHeight } from "~/view/Home";
import { IconTrashX, IconEditCircle, IconSelect, IconX, IconDeviceDesktop, IconDeviceDesktopX } from "@tabler/icons-react";
import { motion, AnimatePresence } from 'framer-motion';
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

// 假设屏幕宽高
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
// 新div的大小
const divWidth = 240;
const divHeight = 240;

// 检查新div的位置是否与现有div重叠
function checkOverlap(newLeft, newTop, existingDivs) {
    return existingDivs.some(div => {
        return newLeft < div.left + divWidth &&
            newLeft + divWidth > div.left &&
            newTop < div.top + divHeight &&
            newTop + divHeight > div.top;
    });
}

// 寻找新div的位置
function findPositionForNewDiv(existingDivs, startLeft = 70, startTop = 70) {
    let left = startLeft;
    let top = startTop;
    while (true) {
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
}

const NoteHome = (props) => {
    const { tools, note, option, home } = useStores();
    const { token } = useToken();
    const [selectOpen, setSelectOpen] = React.useState(false);
    const [stickyIds, setStickyIds] = React.useState([]);

    const containerRef = React.useRef(null);
    const wrapperRef = React.useRef(null);

    const getNote = useMemoizedFn(() => {
        return note.getNote(1, 9999).then((res) => {
            return res.list;
        })
    }, []);

    const { data, error, refresh, run } = useRequest(getNote, {
        manual: true
    });

    const onEdit = useMemoizedFn((id) => {
        note.open(id);
    }, []);

    const onDelete = useMemoizedFn((ids) => {
        note.delectNote(ids).then(() => {
            refresh();
            note.openId = -1;
            if (selectOpen) {
                setSelectOpen(false);
            }
        })
    }, [selectOpen])

    const upadteIds = useMemoizedFn(() => {
        const { homeNoteData } = option.item;
        const ids = homeNoteData?.map((v) => v.id) || [];
        setStickyIds(ids);
    }, [])

    const originalList = React.useMemo(() => {
        if (typeof data !== 'undefined' && !data?.length && !error && note.openId != 0) {
            setTimeout(() => {
                note.open(0);
            }, 50);
        }
        return Array.from(data || [])
    }, [data]);


    const selectList = React.useMemo(() => (data || []).map((v) => v.id), [data]);

    const [list] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 50,
        overscan: 10,
    });

    const { selected, allSelected, isSelected, toggle, toggleAll, partiallySelected } = useSelections(selectList);

    const onContextMenu = React.useCallback((e, id) => {
        e.stopPropagation();
        e.preventDefault();
        const isSticky = stickyIds?.includes(id);
        tools.setRightClickEvent(e, [
            {
                label: isSticky ? '从首屏移除' : "贴在首屏",
                icon: isSticky ? <IconDeviceDesktopX /> : <IconDeviceDesktop />,
                key: "top",
                onClick: () => {
                    if (isSticky) {
                        note.removeSticky(id, true);
                    } else {
                        try {
                            const { homeNoteData } = option.item;
                            const newDivPosition = findPositionForNewDiv(homeNoteData);
                            note.addSticky({ id, left: newDivPosition.left, top: newDivPosition.top });
                        } catch (error) {
                            console.error(error.message);
                        }
                    }

                    setTimeout(() => {
                        upadteIds();
                    }, 200);
                },
            },
            {
                label: "删除便签",
                icon: <IconTrashX />,
                key: "del-group",
                onClick: () => {
                    onDelete([id]);
                },
            },
        ]);
    }, [stickyIds]);

    React.useEffect(() => {
        run();
        upadteIds();
    }, [])

    React.useEffect(() => {
        if (note.openId == -1 && list?.length) {
            note.open(list[0]?.data?.id);
        }
    }, [list])


    useUpdateEffect(() => {
        setTimeout(() => {
            note.open(-1);
            refresh();
            upadteIds();
        }, 300);
    }, [tools.timeKey]);

    return (
        <RowWrap className="sn-bg-wrap" >
            <Left span={7}>
                <ListHeader>
                    <div className="left">
                        {selectOpen ? (
                            <Space>
                                <Checkbox checked={allSelected} onClick={toggleAll} indeterminate={partiallySelected}>
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
                                    <BtnSelectItem danger disabled={selected.length === 0} size="small" icon={<IconTrashX size={16} stroke={1.4} />} >删除</BtnSelectItem>
                                </Popconfirm>
                                <BtnSelectItem size="small" icon={<IconX size={16} stroke={1.4} />} onClick={() => setSelectOpen(false)}>取消</BtnSelectItem>
                            </Space>
                        ) : (
                            <Tooltip placement="top" title={"批量删除"}>
                                <BtnSelect type="link" disabled={selectList.length === 0} icon={<IconSelect size={18} stroke={1.4} />} onClick={() => setSelectOpen(true)}></BtnSelect>
                            </Tooltip>
                        )}
                    </div>
                    <div className="right">
                        <Tooltip placement="top" title={"新增便签"}>
                            <BtnAdd icon={<IconEditCircle size={18} stroke={1.4} />} onClick={() => { note.open(0) }}></BtnAdd>
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
                        {(list || []).map((v, k) => (
                            <Item
                                key={v.data?.id}
                                onClick={() => onEdit(v.data?.id)}
                                className={v.data?.id === note.openId ? 'active' : ''}
                                colorPrimaryBg={token.colorPrimaryBg}
                                colorPrimary={token.colorPrimary}
                                onContextMenu={(e) => onContextMenu(e, v.data?.id)}
                            >
                                <div className="left">
                                    {selectOpen ? <Checkbox checked={isSelected(v.data?.id)} onClick={() => toggle(v.data?.id)} /> : null}
                                </div>
                                <div className="right">
                                    <ItemHeader>
                                        <time>{dayjs(v.data?.updateTime).format('YYYY年MM月DD日 HH:mm')}</time>
                                    </ItemHeader>
                                    <ItemContent ellipsis><TextOnlyComponent content={v.data?.content} /></ItemContent>
                                    {stickyIds.includes(v.data?.id) ? (
                                        <div className="sticky">
                                            <IconDeviceDesktop size={14} stroke={1.8} />
                                        </div>
                                    ) : null}
                                </div>
                            </Item>
                        ))}
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
                                <BtnDel danger type="text" icon={<IconTrashX size={20} stroke={1.4} />}></BtnDel>
                            </Tooltip>
                        </Popconfirm>
                    ) : null}
                </RightBtnWrap>
                <AddNote refresh={refresh} />
            </Rtight>
        </RowWrap>
    );
};

export default observer(NoteHome);
