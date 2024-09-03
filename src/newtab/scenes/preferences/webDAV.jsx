import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Button, Input, Modal, Divider, Checkbox, Select, Tag } from "antd";
import { useDebounceFn } from 'ahooks';
import useStores from "~/hooks/useStores";
import { ExclamationCircleFilled } from "@ant-design/icons";
import _ from "lodash";

const { confirm } = Modal;

const Space = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
`;

const Info = styled.div`
    display: flex;
    color: var(--colorText);
    font-size: 12px;
    margin-top: 10px;
        gap: 5px;
    a {
        font-size: 12px;
        color: var(--PrimaryColor);
    }
`;

const WebDAV = () => {
    const { option, data, tools } = useStores();
    const _option = _.cloneDeep(option.item);
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);

    const { webDavURL, webDavUsername, webDavPassword, webDavDir, webdavTime } = _option;

    const handleChange = React.useCallback((value) => {
        for (const key in value) {
            const v = value[key];
            option.setItem(key, v);
        }
    }, []);

    const onModalClose = React.useCallback(() => {
        setOpen(false);
    }, []);

    const onModalOpen = React.useCallback(() => {
        setOpen(true);
    }, []);

    const onFinish = (v) => {
        setLoading(true);
        data.test(v.webDavURL, v.webDavUsername, v.webDavPassword, v.webDavDir).then((res) => {
            console.log('%c [ res ]-29', 'font-size:13px; background:pink; color:#bf2c9f;', res)
            if (res == 1) {
                confirm({
                    title: "监测到远端有数据，即将删除本地所有数据",
                    icon: <ExclamationCircleFilled />,
                    content: (
                        <div>
                            <p>点击确认将删除当前所有数据并拉取远端数据，建议先点击下方按钮导出本地数据</p>
                            <Button size="small" onClick={() => tools.onExport()} > 导出本地数据 </Button>
                        </div>
                    ),
                    okText: "确认",
                    okType: "danger",
                    cancelText: "取消",
                    onOk() {
                        handleChange(v);
                        option.setItem('webdavOpen', true);
                        option.setItem('webdavVersion', 1);
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    },
                    onCancel() {
                        setLoading(false);
                     },
                });
            } else {
                handleChange(v);
                setTimeout(() => {
                    window.location.reload();
                    tools.success("WebDAV 设置成功");
                }, 1000);
            }

        }).catch((err) => {
            tools.error("WebDAV 设置失败");
        }).finally(() => {
        });


    };

    return (
        <>
            <Form
                layout="vertical"
                initialValues={{
                    webdavTime
                }}
                onValuesChange={handleChange}
            >

                <Form.Item label={(<Space>服务器链接配置 <Tag color="error">Beta</Tag></Space>)} >
                    <Space >
                        <Button type="primary" block onClick={onModalOpen} >
                            设置
                        </Button>
                        {webDavURL ? (<Button onClick={data.deleteServeData} >
                            清空
                        </Button>) : null}
                    </Space>
                    <Info>
                        关于WebDAV的配置教程请<a href="https://mumingfang.com/forum.php?mod=viewthread&tid=55" target="_blank" >点击这里</a>
                    </Info>
                </Form.Item>
                <Divider />
                <Form.Item label="同步间隔时间" name='webdavTime'>
                    <Select
                        size="large"
                        style={{ width: '100%' }}
                        options={[
                            { value: 1, label: '1秒' },
                            { value: 3, label: '3秒' },
                            { value: 5, label: '5秒' },
                            { value: 10, label: '10秒' },
                            { value: 60, label: '60秒' },
                        ]}
                    />
                </Form.Item>
            </Form>
            <Modal
                title="设置 WebDAV"
                centered
                wrapClassName={``}
                open={open}
                onCancel={onModalClose}
                footer={null}
                width={320}
            >
                <Form
                    layout="vertical"
                    initialValues={{
                        webDavURL,
                        webDavUsername,
                        webDavPassword,
                        webDavDir,
                    }}
                    onFinish={onFinish}
                // onValuesChange={run}
                >
                    <Form.Item
                        label="服务器地址"
                        name='webDavURL'
                        rules={[
                            {
                                required: true,
                                message: '必填',
                            }
                        ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="账户"
                        name='webDavUsername'
                        rules={[
                            {
                                required: true,
                                message: '必填',
                            }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="密码"
                        name='webDavPassword'
                        rules={[
                            {
                                required: true,
                                message: '必填',
                            }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        label="目录"
                        name='webDavDir'
                        rules={[
                            {
                                required: true,
                                message: '必填',
                            }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} >
                            保存
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>

    );
};
export default observer(WebDAV);
