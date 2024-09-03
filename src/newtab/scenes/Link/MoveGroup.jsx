import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Tree, Tooltip, Button } from "antd";
import {
    IconPencilMinus,
} from "@tabler/icons-react";
import styled from "styled-components";
import { ReactSortable } from "react-sortablejs";
import _ from "lodash";

const transformArrayToTree = (items, homeId) => {
    const itemMap = _.keyBy(items, 'timeKey');

    const result = [];

    items.forEach(item => {
        if (!itemMap[item.timeKey].children) {
            itemMap[item.timeKey].children = [];
        }

        if (item.parentId === homeId) {
            result.push(itemMap[item.timeKey]);
        } else {
            if (itemMap[item.parentId]) {
                if (!itemMap[item.parentId].children) {
                    itemMap[item.parentId].children = [];
                }
                itemMap[item.parentId].children.push(itemMap[item.timeKey]);
            }
        }
    });
    const sortChildren = (node) => {
        if (node.children) {
            node.children.sort((a, b) => a.sort - b.sort);
            node.children.forEach(child => sortChildren(child));
        }
    };

    result.forEach(sortChildren);

    const transformItem = (item) => ({
        title: item.title,
        sort: item.sort,
        key: item.timeKey,
        id: item.linkId,
        children: item.children.map(child => transformItem(child))
    });

    return _.sortBy(result.map(item => transformItem(item)), 'sort');
};

const treeToArrayWithNewSort = (tree, parentId = null) => {
    let result = [];
    tree.forEach((node, index) => {
        // 创建一个新的对象，包含原始所需的属性和新的 sort 值
        const newItem = {
            // title: node.title,
            linkId: node.id, // 传递原始节点的 ID
            timeKey: node.key, // 传递原始节点的 key
            parentId: parentId, // 设置父节点 ID
            sort: index // 使用当前索引作为新的 sort 值
        };

        // 删除不需要的 children 属性
        delete newItem.children;

        // 将当前节点加入结果数组
        result.push(newItem);

        // 如果存在子节点，递归处理子节点
        if (node.children && node.children.length > 0) {
            const childItems = treeToArrayWithNewSort(node.children, node.key); // 传递当前节点的 key 作为子节点的 parentId
            result = result.concat(childItems);
        }
    });
    return result;
};

const WrapBox = styled.div`
    overflow: auto;
    padding: 10px 0;
`;
const Wrap = styled.div`
    display: flex;
    gap: 10px;
    overflow-x: auto;
    flex-wrap: nowrap;
`;

const Panel = styled.div`
    border: 1px solid #eee;
    border-radius: 4px;
    background-color: var(--fff);
    padding: 5px;
    width: 100px;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 5px;
    > span {
        display: flex;
        border-bottom: 1px solid #eee;
        cursor: move;
    }
    .scroll-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-height: 180px;
    }
`;

const Item = styled.div`
    padding: 5px;
    background-color: var(--fff);
    border: 1px solid #eee;
    border-radius: 2px;
    font-size: 12px;
    line-height: 1.2;
    cursor: move;
    transition: all 0.3s ease;
    &:hover {
        background-color: #f5f5f5;
    }
`;

const WrapBtn = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 10px;
    align-items: center;
`;

const MoveGroup = (props) => {
    const {
    } = props;
    const { option, tools, link } = useStores();
    const [treeData, setTreeData] = React.useState([]);

    const onInit = React.useCallback(() => {
        option.getHomeId().then((homeId) => {
            const list = [];
            link.getLinkByParentId([homeId]).then((res) => {
                list.push(...res);
                link.getLinkByParentId(res.map((v) => v.timeKey)).then((v) => {
                    list.push(...v);
                    setTreeData(transformArrayToTree(list, homeId));
                })
            });
        });
    }, []);

    const onSave = React.useCallback(() => {
        option.getHomeId().then((homeId) => {
            const updateList = treeToArrayWithNewSort(treeData, homeId);
            console.log('%c [ updateList ]-152', 'font-size:13px; background:pink; color:#bf2c9f;', updateList)
            link.updateLink(updateList).then((res) => {
                link.restart();
                tools.closePublicModal();
            })
        });

    }, [treeData])


    React.useEffect(() => {
        onInit();
    }, [])


    return (
        <WrapBox>
            <ReactSortable
                tag={Wrap}
                className="scroll-container"
                name="grout-list"
                animation={150}
                group="grout"
                ghostClass={["grout-list-ghost"]}
                list={treeData}
                setList={(value) => {
                    setTreeData(value);
                }}
            >
                {treeData.map((item, key) => (
                    <Panel key={item.key}>
                        <span>{item.title}</span>
                        <ReactSortable
                            className="scroll-container"
                            name="grout-item"
                            animation={150}
                            group="grout-item"
                            ghostClass={["grout-list-ghost"]}
                            list={treeData[key].children}
                            setList={(value) => {
                                setTreeData((old) => {
                                    const newValue = _.cloneDeep(old);
                                    newValue[key].children = value;
                                    return newValue;
                                });
                            }}
                        >
                            {treeData[key].children.map((v, k) => (
                                <Item key={v.key}>
                                    <span>{v.title}</span>
                                </Item>
                            ))}
                        </ReactSortable>
                    </Panel>
                ))}
            </ReactSortable>
            <WrapBtn>
                <Button type="primary" onClick={onSave}>保存</Button>
            </WrapBtn>
        </WrapBox>
    );
};

export default observer(MoveGroup);
