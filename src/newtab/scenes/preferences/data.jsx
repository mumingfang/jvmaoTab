import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Upload, Divider, Button, Spin, Modal, Input } from "antd";
import "dexie-export-import";
import { db } from "~/db";
import { IconFileArrowLeft } from "@tabler/icons-react";
import { ExclamationCircleFilled } from "@ant-design/icons";
import _ from "lodash";

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

    const progressCallback = React.useCallback((props) => {
        const { totalRows, completedRows } = props;
        // const percent = Math.floor(completedRows / totalRows * 100);
    }, []);

    const beforeUpload = React.useCallback((file) => {
        const fileType = ['application/json'];

        if (!fileType.includes(file.type)) {
            tools.error(`不支持的文件格式 ${file.type}`);
            return false;
        }

        return true;
    }, []);

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
                                    }, 300);
                                });
                            }, 1000);


                        } catch (error) {
                            console.error(error.message);
                            tools.error(`${error.message}`);
                            setTimeout(() => {
                                window.location.reload();
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
            <Spin spinning={spinning} fullscreen />
        </Form>
    );
};
export default observer(PreferencesData);
