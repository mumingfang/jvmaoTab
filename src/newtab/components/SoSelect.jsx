import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Switch, Modal, Avatar, Button, Form, Input } from "antd";
import { useControllableValue, useUpdateEffect } from 'ahooks';
import { SoIcon } from "../../SearchIcon";
import styled from "styled-components";
import _ from "lodash";
import api from "~/utils/api";
import { ReactSortable } from "react-sortablejs";
import { IconX } from "@tabler/icons-react";
import FavIconIcon from "~/scenes/public/FavIconIcon";
import { getID } from "~/utils";

function checkUrlHasSpecificQueryAndEndsWithEqual(url, queryKey) {
    // 解析URL中的查询字符串
    const queryString = url.split('?')[1];
    if (!queryString) {
        return false; // 没有查询字符串
    }

    // 将查询字符串分解为键值对
    const params = new URLSearchParams(queryString);

    // 检查是否存在特定的查询参数并且查询字符串以等号结尾
    return params.has(queryKey) && queryString.endsWith('=');
}

function getDomainFromUrl(url) {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
}

const Wrap = styled.div`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    background-color: var(--fff);
    border: 1px solid var(--notebrColor);
    cursor: pointer;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    overflow: hidden;
    .ant-avatar{
        display: flex;
        justify-content: center;
        align-items: center;
        border: 1px solid var(--notebrColor);
    }
`;

const Item = styled.div`
    width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 8px;
    border: 1px solid var(--notebrColor);
    margin: 5px auto;
    padding: 8px 12px;
    cursor: pointer;
    background-color: var(--fff);
    i {
        color: #ddd;
        svg {
            width: 14px;
            height: 14px;
        }
    }
    > svg {
        width: 20px;
        height: 20px;
    }
    > span {
        flex: 1;
        font-size: 14px;
        color: var(--colorText);
    }
    .remove {
        color: #999;
        opacity: 0;
        transition: opacity 0.3s;
    }
    &:hover {
        .remove {
            opacity: 1;
        }
    }
`;

const AddLlink = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 15px 0 0;
    font-size: 14px;
    color: var(--colorText);
    cursor: pointer;
`;

const Info = styled.div`
    margin: 15px 0;
    h4 {
        margin: 0;
    }
    p {
        margin: 5px 0 0;
        font-size: 14px;
        color: #888;
        line-height: 1.5;
    }
`;

const SoSelect = (props) => {
    const { tools, option } = useStores();
    const { customkey } = option.item;
    const [value, setValue] = useControllableValue(props);
    const [list, setList] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [openAdd, setOpenAdd] = React.useState(false);
    const [customList, setCustomList] = React.useState(customkey || []);

    const state = React.useRef({
        isChange: false,
        isInit: false
    }).current;

    const onChange = React.useCallback((value) => {
        if (state.isChange) {
            Promise.resolve().then(() => {
                setList(value);
                state.isChange = false;
            });

        }
    }, [])

    const onSwitchChange = React.useCallback((key, checked) => {

        const n = _.cloneDeep(list);
        n[key].checked = checked;

        // 判断n里是否还有被选中
        const arr = _.filter(n, (v) => {
            return v.checked
        })

        if (arr.length === 0) {
            tools.error('至少选择一个搜索源');
        } else {
            setList(n);
        }


    }, [list]);

    const onModalClose = React.useCallback(() => {
        setOpen(false);
    }, []);

    const onAddModalClose = React.useCallback(() => {
        setOpenAdd(false);
    });

    const onRemoveCustomkey = React.useCallback((key) => {
        setCustomList(() => {
            const v = _.cloneDeep(customList);
            _.remove(v, function (item) {
                return item.key === key;
            });
            setCustomList(v);
            option.setItem('customkey', v);
            return v
        })
    }, [customList])

    const onFinish = React.useCallback((values) => {
        console.log('Success:', values);
        if (!checkUrlHasSpecificQueryAndEndsWithEqual(values['url'], values['searchParams'])) {
            tools.error('网址填写不正确，请检查后重新填写');
            return;
        }
        api.get(values['url']);
        setCustomList((oldV) => {
            const v = _.cloneDeep(oldV);
            v.push({
                isCustom: true,
                key: getID(),
                host: [getDomainFromUrl(values['url'])],
                ...values,
            });
            option.setItem('customkey', v);
            onAddModalClose();
            return v;
        })
    }, []);

    React.useEffect(() => {
        const soLost = [...customList, ...SoIcon];
        const arr = _.orderBy(soLost, item => {
            const index = _.indexOf(value, item.key)
            return index === -1 ? Infinity : index;
        }, ['asc']);

        // let arr = _.sortBy(soLost, function (item) {
        //     return value.indexOf(item.key) > -1 ? -1 : 1;
        // });

        _.forEach(arr, (v, k) => {
            if (value.indexOf(v.key) > -1) {
                v.checked = true;
            } else {
                v.checked = false;
            }
        })

        setList(arr);

        setTimeout(() => {
            state.isInit = true;
        }, 0);
    }, [customList])

    useUpdateEffect(() => {
        if (!state.isInit) {
            return;
        }
        const newValue = [];
        _.forEach(list, (v, k) => {
            if (v.checked) {
                newValue.push(v.key);
            }
        })
        setValue(newValue);
    }, [list])

    return (
        <>
            <Wrap onClick={() => setOpen(true)}>
                <Avatar.Group>
                    {list.map((v, k) => {
                        if (v.checked) {
                            if (v.icon) {
                                return (
                                    <Avatar key={v.key} style={{ backgroundColor: 'var(--fff)' }} icon={v.icon} />
                                )
                            } else {
                                return (
                                    <Avatar key={v.key} style={{ backgroundColor: 'var(--fff)' }} icon={<FavIconIcon size={20} url={v.url} onlyDomain />} />
                                )
                            }
                        }
                        return null;
                    })}
                </Avatar.Group>
            </Wrap>

            <Modal
                title="搜索源设置"
                centered
                wrapClassName={``}
                open={open}
                onOk={onModalClose}
                onCancel={onModalClose}
                footer={null}
                width={420}
            >
                <ReactSortable
                    animation={150}
                    group="soSelect"
                    ghostClass={["soSelect-ghost-new"]}
                    list={list}
                    setList={onChange}
                    onUpdate={(e) => {
                        state.isChange = true;
                    }}
                >
                    {list.map((v, k) => {
                        return (
                            <Item key={v.key}>
                                <i>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-grip-vertical"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
                                </i>
                                {v.icon ? v.icon : <FavIconIcon size={20} url={v.url} onlyDomain />}
                                <span>{v.name}</span>
                                {v.isCustom ? <IconX className="remove" size={20} onClick={() => onRemoveCustomkey(v.key)} /> : null}
                                <Switch size="small" onChange={(checked) => onSwitchChange(k, checked)} checked={v.checked} />
                            </Item>
                        );
                    })}
                </ReactSortable>
                <AddLlink onClick={() => setOpenAdd(true)}>添加自定义搜索源</AddLlink>
            </Modal>
            <Modal
                title="添加自定义搜索源"
                centered
                wrapClassName={``}
                open={openAdd}
                onOk={onAddModalClose}
                onCancel={onAddModalClose}
                footer={null}
                width={500}
            >
                <Form
                    name="basic"
                    layout="vertical"
                    initialValues={{

                    }}
                    onFinish={onFinish}
                >
                    <Info>
                        <h4>使用说明</h4>
                        <p>网址必须包含Query查询参数并以等于号结尾，需要将参数名填写到 "关键字字段名称" 中</p>
                        <p>示例：谷歌，网址填写 “https://www.google.com/search?q=” , 关键字字段名称填写 “q”</p>
                        <p>添加后如果图标没有显示出来，您可以手动访问添加的页面，比如以上这个只要访问 https://www.google.com/ 即可</p>
                    </Info>
                    <Form.Item
                        label="网站名称"
                        name="name"
                        rules={[
                            {
                                required: true,
                                message: '请输入名称',
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="网址"
                        name="url"
                        rules={[
                            {
                                required: true,
                                message: '请输入网址',
                            },
                            {
                                type: 'url',
                                message: '请输入正确的网址',
                            }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="关键字字段名称"
                        name="searchParams"
                        rules={[
                            {
                                required: true,
                                message: '请输入关键字字段名称',
                            }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                    >
                        <Button type="primary" htmlType="submit">
                            保存
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>

    );
};
export default observer(SoSelect);

