import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Upload, Divider, Button, Spin, Modal, Input } from "antd";
import "dexie-export-import";
import { db } from "~/db";
import { IconFileArrowLeft } from "@tabler/icons-react";
import { ExclamationCircleFilled } from "@ant-design/icons";
import _ from "lodash";
import dayjs from 'dayjs';
import { downloadBlob } from '~/utils';
import { listWebdavLocalBackups } from '~/stores/webdavLocalBackup';

import useStores from "~/hooks/useStores";

const { confirm } = Modal;


const UploadWrap = styled(Upload)`
    .ant-upload {
        width: 100% !important;
        height: 150px !important;
        margin: 0 !important;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        svg {
            color: #ccc;
        }
    }
`;

const Info = styled.div`
    margin-top: 5px;
    font-size: 12px;
    color: #999;
`;

const PreferencesData = () => {
    const { option, tools, link, note, data } = useStores();
    // const _option = _.cloneDeep(option.item);
    const [spinning, setSpinning] = React.useState(false);
    const [backupOpen, setBackupOpen] = React.useState(false);
    const [localBackups, setLocalBackups] = React.useState([]);

    const openLocalBackups = async () => {
        try {
            setLocalBackups(await listWebdavLocalBackups());
            setBackupOpen(true);
        } catch (error) {
            tools.error(`读取本地同步备份失败: ${error.message}`);
        }
    };

    const progressCallback = React.useCallback((props) => {
        if (props) {
            const { totalRows, completedRows } = props;
            // const percent = Math.floor(completedRows / totalRows * 100);
        }
    }, []);

    const beforeUpload = React.useCallback((file) => {
        const fileType = ['application/json'];

        if (!file || !fileType.includes(file.type)) {
            if (tools && typeof tools.error === 'function') {
                tools.error(`不支持的文件格式 ${file?.type || '未知'}`);
            }
            return false;
        }

        return true;
    }, [tools]);

    const handleChange = async (info) => {
        if (info.file.status === 'uploading') {
            return;
        }
        if (info.file.status === 'done') {
            confirm({
                title: "即将删除所有数据",
                icon: <ExclamationCircleFilled />,
                content: "点击确认将删除当前所有数据并导入新数据",
                okText: "确认",
                okType: "danger",
                cancelText: "取消",
                onOk() {
                    setSpinning(true);
                    var reader = new FileReader();
                    reader.onload = async (e) => {
                        var blob = new Blob([e.target.result], { type: info.file.type });

                        try {
                            blob.text().then(async (text) => {
                                if (!text) {
                                    throw new Error('文件内容为空');
                                }
                                let json;
                                try {
                                    json = JSON.parse(text);
                                } catch (parseError) {
                                    throw new Error('JSON 解析失败，请检查文件格式');
                                }
                                
                                if (!json || !json.data) {
                                    throw new Error('数据格式错误：缺少 data 字段');
                                }
                                
                                const databaseName = json.data.databaseName;
                                if (databaseName !== 'jvmao-tab') {
                                    throw new Error('数据库名称错误');
                                }
                                const databaseVersion = json.data.databaseVersion;

                                await db.delete();
                                if (!db.isOpen()) {
                                    await db.open();
                                }

                                await db.import(blob, { noTransaction: false, clearTables: true, acceptVersionDiff: true, progressCallback });

                                setTimeout(() => {
                                    data.deleteServeData();
                                    option.resetChromeSaveOption().then(() => {
                                        tools.success('数据导入成功');
                                    }).catch(() => {
                                        tools.error('数据导入失败，O-86');
                                    }).finally(() => {
                                        setTimeout(() => {
                                            setSpinning(false);
                                            link.restart();
                                            note.init();

                                            if (db.verno !== databaseVersion) {
                                                db.__upgrade(db);
                                            }
                                        }, 300);
                                    });
                                }, 1000);
                            });

                        } catch (error) {
                            console.error('Data import error:', error);
                            if (tools && typeof tools.error === 'function') {
                                tools.error(error.message || '数据导入失败');
                            }
                            setSpinning(false);
                            setTimeout(() => {
                                // window.location.reload();
                            }, 2000);
                        }
                    }
                    reader.readAsArrayBuffer(info.file.originFileObj);
                },
                onCancel() { },
            });
        }
    };


    return (
        <Form
            name="so"
            layout="vertical"
            initialValues={{
            }}
        >
            <Form.Item >
                <UploadWrap
                    name="bg"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                >
                    <IconFileArrowLeft size={35} stroke={1.5} />
                    <Info>数据导入</Info>
                </UploadWrap>
            </Form.Item>
            <Divider />
            <Form.Item>
                <Button type="primary" block onClick={tools.onExport}>
                    数据导出
                </Button>
                <Info>导出数据中不会包含已上传的壁纸</Info>
            </Form.Item>
            <Form.Item>
                <Button block onClick={openLocalBackups}>查看本地同步备份</Button>
                <Info>WebDAV 拉取前自动保留最近 3 份有内容的本地数据</Info>
            </Form.Item>
            <Modal title="本地同步备份" open={backupOpen} footer={null}
                onCancel={() => setBackupOpen(false)}>
                {localBackups.length === 0 ? <Info>暂无本地同步备份</Info> :
                    localBackups.map((backup) => (
                        <div key={backup.id} style={{ display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', marginBottom: 12 }}>
                            <span>{dayjs(backup.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                                {' · '}{(backup.blob.size / 1024).toFixed(1)} KB</span>
                            <Button onClick={() => downloadBlob(backup.blob,
                                `jvmao-local-backup-${backup.createdAt}.json`)}>导出</Button>
                        </div>
                    ))}
            </Modal>
            <Spin spinning={spinning} fullscreen />
        </Form>
    );
};
export default observer(PreferencesData);
