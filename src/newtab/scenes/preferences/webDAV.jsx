import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Button, Input, Modal, Divider, Checkbox, Select, Tag } from "antd";
import { useDebounceFn } from 'ahooks';
import useStores from "~/hooks/useStores";
import { ExclamationCircleFilled } from "@ant-design/icons";
import _ from "lodash";
import {
    createWebdavConfigToken,
    isWebdavConfigToken,
    parseWebdavConfigToken,
} from '~/stores/webdavConfigToken.mjs';

const { confirm } = Modal;

const Space = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
`;

const WebDAV = () => {
    const { option, data, tools } = useStores();
    const _option = _.cloneDeep(option.item);
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [configForm] = Form.useForm();
    const [backupOpen, setBackupOpen] = React.useState(false);
    const [backupToken, setBackupToken] = React.useState('');
    const [importOpen, setImportOpen] = React.useState(false);
    const [importToken, setImportToken] = React.useState('');
    const [importing, setImporting] = React.useState(false);

    const { webDavURL, webDavUsername, webDavPassword, webDavDir, webdavTime } = _option;

    const handleChange = React.useCallback((value) => {
        if (!value || typeof value !== 'object') {
            return;
        }
        for (const key in value) {
            const v = value[key];
            option.setItem(key, v);
        }
    }, [option]);

    const onModalClose = React.useCallback(() => {
        setOpen(false);
    }, []);

    const onModalOpen = React.useCallback(() => {
        configForm.setFieldsValue({
            webDavURL: option.item.webDavURL,
            webDavUsername: option.item.webDavUsername,
            webDavPassword: option.item.webDavPassword,
            webDavDir: option.item.webDavDir,
        });
        setOpen(true);
    }, [configForm, option]);

    const createBackupToken = async () => {
        try {
            setBackupToken(await createWebdavConfigToken(option.item));
            setBackupOpen(true);
        } catch (error) {
            tools.error(error.message || '生成配置串失败');
        }
    };

    const fillFromToken = async (token) => {
        setImporting(true);
        try {
            const config = await parseWebdavConfigToken(token);
            configForm.setFieldsValue(config);
            setImportOpen(false);
            setImportToken('');
            setOpen(true);
            tools.success('配置已填入，请检查后保存');
        } catch (error) {
            tools.error(error.message || '解析配置串失败');
        } finally {
            setImporting(false);
        }
    };

    const copyBackupToken = async () => {
        try {
            await navigator.clipboard.writeText(backupToken);
            tools.success('配置串已复制');
        } catch {
            tools.error('复制失败，请手动选中配置串复制');
        }
    };

    const onFinish = (v) => {
        if (!v || !data || typeof data.test !== 'function') {
            if (tools && typeof tools.error === 'function') {
                tools.error("WebDAV 配置无效");
            }
            return;
        }
        
        const saveSettings = async (hasRemoteData) => {
            data.pause();
            try {
                await Promise.all(Object.entries(v).map(([key, value]) => option.setItem(key, value)));
                await option.setItem('webdavOpen', true);
                await option.setItem('webdavExpectedRemote', hasRemoteData);
                await option.setItem('webdavVersion', 0);
                window.location.reload();
            } catch (error) {
                tools.error(error.message || '保存 WebDAV 配置失败');
                setLoading(false);
            }
        };
        setLoading(true);
        data.test(v.webDavURL, v.webDavUsername, v.webDavPassword, v.webDavDir).then((res) => {
            if (res == 1) {
                confirm({
                    title: "监测到远端有数据，即将删除本地所有数据",
                    icon: <ExclamationCircleFilled />,
                    content: (
                        <div>
                            <p>点击确认将删除当前所有数据并拉取远端数据，建议先点击下方按钮导出本地数据</p>
                            <Button size="small" onClick={() => {
                                if (tools && typeof tools.onExport === 'function') {
                                    tools.onExport();
                                }
                            }} > 导出本地数据 </Button>
                        </div>
                    ),
                    okText: "确认",
                    okType: "danger",
                    cancelText: "取消",
                    onOk() {
                        return saveSettings(true);
                    },
                    onCancel() {
                        setLoading(false);
                     },
                });
            } else {
                saveSettings(false);
            }

        }).catch((err) => {
            console.error('WebDAV test error:', err);
            if (tools && typeof tools.error === 'function') {
                tools.error(err.message || "WebDAV 设置失败");
            }
            setLoading(false);
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
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                        <a href="#webdav-config" onClick={(event) => {
                            event.preventDefault();
                            setImportOpen(true);
                        }}>粘贴配置串</a>
                        {webDavURL ? <a href="#webdav-config" onClick={(event) => {
                            event.preventDefault();
                            createBackupToken();
                        }}>生成加密配置串</a> : null}
                    </div>
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
                forceRender
                open={open}
                onCancel={onModalClose}
                footer={null}
                width={320}
            >
                <Form
                    form={configForm}
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
            <Modal title="备份 WebDAV 配置" open={backupOpen} footer={null}
                onCancel={() => setBackupOpen(false)}>
                <p>配置串包含可还原的账号和密码，请像密码一样保管。</p>
                <Input.TextArea value={backupToken} readOnly autoSize={{ minRows: 4, maxRows: 8 }} />
                <Button type="primary" block style={{ marginTop: 12 }} onClick={copyBackupToken}>
                    复制配置串
                </Button>
            </Modal>
            <Modal title="粘贴 WebDAV 配置串" open={importOpen} footer={null}
                onCancel={() => setImportOpen(false)}>
                <p>粘贴后会自动解析并填入设置表单，检查后再保存连接。</p>
                <Input.TextArea value={importToken} autoSize={{ minRows: 4, maxRows: 8 }}
                    onChange={(event) => setImportToken(event.target.value)}
                    onPaste={(event) => {
                        const pasted = event.clipboardData.getData('text').trim();
                        if (isWebdavConfigToken(pasted)) {
                            event.preventDefault();
                            setImportToken(pasted);
                            fillFromToken(pasted);
                        }
                    }} />
                <Button type="primary" block style={{ marginTop: 12 }} loading={importing}
                    onClick={() => fillFromToken(importToken)}>
                    解析并填入
                </Button>
            </Modal>
        </>

    );
};
export default observer(WebDAV);
