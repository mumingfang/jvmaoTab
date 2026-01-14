import React from "react";
import { observer } from "mobx-react";
import { Form, Input, Upload } from "antd";
import useStores from "~/hooks/useStores";
import { IconPhotoUp } from "@tabler/icons-react";
import styled from "styled-components";
import { useControllableValue } from 'ahooks';
import cx from "classnames";

const Wrap = styled(Upload)`
    .ant-upload {
        width: 100% !important;
        height: 150px !important;
        margin: 0 !important;
        overflow: hidden;
    }
    .bgImg {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
    }
    &.hidden {
        .bgImg {
            filter: blur(35px);
            transition: all 0.3s ease-in-out;
        }
        &:hover {
            .bgImg {
                filter: blur(0);
            }
        }
    }
`;

const UploadImg = (props) => {
    const { hidden = false } = props
    const { tools } = useStores();
    const [imageUrl, setImageUrl] = useControllableValue(props);
    // 用于显示的临时 URL
    const [displayUrl, setDisplayUrl] = React.useState('');

    const beforeUpload = (file) => {
        const fileType = ['image/jpeg', 'image/jpg', 'image/png', 'image/apng', 'image/gif', 'image/bmp', 'image/webp', 'image/heif', 'image/heic'];

        if (!fileType.includes(file.type)) {
            tools.error(`不支持的文件格式${file.type}，请上传常用的图片格式，如：jpg、png`);
            return false;
        }

        return true;
    };

    const handleChange = (info) => {
        if (info.file.status === 'uploading') {
            return;
        }
        if (info.file.status === 'done') {
            // 直接使用 Blob/File 对象，不再转 base64
            const file = info.file.originFileObj;
            if (file) {
                // 立即显示预览
                const previewUrl = URL.createObjectURL(file);
                setDisplayUrl(previewUrl);
                // 传递 Blob 给父组件（而不是 base64 字符串）
                setImageUrl(file);
            }
        }
    };

    // 计算显示用的 URL
    const showImgUrl = React.useMemo(() => {
        // 优先使用临时预览 URL
        if (displayUrl) {
            return displayUrl;
        }
        // 兼容旧的 base64 字符串
        if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
            return imageUrl;
        }
        // 标记值，表示使用 Blob 存储
        if (imageUrl === '__BLOB__') {
            return ''; // 需要从 Storage 读取，由父组件处理
        }
        // Blob 对象
        if (imageUrl instanceof Blob) {
            return URL.createObjectURL(imageUrl);
        }
        return '';
    }, [imageUrl, displayUrl]);

    // 清理临时 URL
    React.useEffect(() => {
        return () => {
            if (displayUrl) {
                URL.revokeObjectURL(displayUrl);
            }
        };
    }, [displayUrl]);

    return (
        <Wrap
            name="bg"
            className={cx({ hidden })}
            listType="picture-card"
            showUploadList={false}
            beforeUpload={beforeUpload}
            onChange={handleChange}
        >
            {showImgUrl ? (
                <img
                    className="bgImg"
                    src={showImgUrl}
                    alt="bg"
                />
            ) : (
                <IconPhotoUp size={20} />
            )}
        </Wrap>
    );
};
export default observer(UploadImg);
