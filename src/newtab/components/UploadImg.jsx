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
const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
};

const UploadImg = (props) => {
    const { hidden = false } = props
    const { tools } = useStores();
    // const [loading, setLoading] = React.useState(false);
    const [imageUrl, setImageUrl] = useControllableValue(props);

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
            // setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            // getBase64(info.file.originFileObj, (url) => {
            //     // setLoading(false);
            //     setImageUrl(url);
            // });

            var reader = new FileReader();
            reader.onload = function (e) {
                var blob = new Blob([e.target.result], { type: info.file.type });
                setImageUrl(blob);
            };
            reader.readAsArrayBuffer(info.file.originFileObj);
        }
    };
    return (
        <Wrap
            name="bg"
            className={cx({ hidden })}
            listType="picture-card"
            showUploadList={false}
            beforeUpload={beforeUpload}
            onChange={handleChange}
        >
            {imageUrl ? (
                <img
                    className="bgImg"
                    src={typeof imageUrl === 'string' || !imageUrl ? imageUrl : URL?.createObjectURL(imageUrl)}
                    alt="bg"
                />
            ) : (
                <IconPhotoUp size={20} />
            )}
        </Wrap>
    );
};
export default observer(UploadImg);
