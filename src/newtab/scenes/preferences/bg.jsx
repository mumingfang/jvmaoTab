import React from "react";
import { observer } from "mobx-react";
import { Form, Input, Select, Divider, ColorPicker, Row, Col, theme } from "antd";
import useStores from "~/hooks/useStores";
import UploadImg from "~/components/UploadImg";
import ColorSelect from "~/components/ColorSelect";
import Storage from "~/utils/storage";

const typeOption = [
    { value: 'bing', label: '必应每日壁纸' },
    { value: 'url', label: '网络图片' },
    { value: 'file', label: '上传图片' },
];

const PreferencesBG = () => {
    const { tools, option, home } = useStores();
    const { bgType, bgUrl, bgBase64, bg2Type, bg2Url, bg2Base64, bgColor } = option.item;

    const handleChange = (value) => {
        // console.log('%c [ value ]-21', 'font-size:13px; background:pink; color:#bf2c9f;', value)
        for (const key in value) {
            if (Object.hasOwnProperty.call(value, key)) {
                let v = value[key];

                switch (key) {
                    case 'bgColor':
                        v = v.toHexString();
                        break;
                    // case 'bgBase64':
                    // case 'bg2Base64':
                    //     Storage.removeBlob(key);
                    //     Storage.remove(`${key}_thumbnail`);
                    //     break;
                }

                option.setItem(key, v);
            }
        }
        setTimeout(() => {
            home.onLoadBg();
        }, 200)
    };

    return (
        <Form
            name="basic"
            layout="vertical"
            initialValues={{
                bgType,
                bgUrl,
                bgBase64,
                bg2Type,
                bg2Url,
                bg2Base64,
                bgColor,
            }}
            onValuesChange={handleChange}
        >
            <Form.Item label="壁纸" name='bgType'>
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={[
                        ...typeOption,
                        { value: 'color', label: '纯色' },
                    ]}
                />
            </Form.Item>
            {bgType === 'url' && (
                <Form.Item label="网络图片地址" name='bgUrl'>
                    <Input size="large" placeholder="http://" />
                </Form.Item>
            )}
            {bgType === 'file' && (
                <Form.Item label="上传图片" name='bgBase64'>
                    <UploadImg />
                </Form.Item>
            )}

            {bgType === 'color' && (
                <Form.Item label="纯色" name='bgColor'>
                    <ColorSelect />
                </Form.Item>
            )}


            <Divider />

            <Form.Item label="第二壁纸" name='bg2Type' tooltip="长按壁纸可显示">
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={
                        [
                            { value: 'null', label: '无' },
                            ...typeOption,
                        ]
                    }
                />
            </Form.Item>
            {bg2Type === 'url' && (
                <Form.Item label="网络图片地址" name='bg2Url'>
                    <Input size="large" placeholder="http://" />
                </Form.Item>
            )}
            {bg2Type === 'file' && (
                <Form.Item label="上传图片" name='bg2Base64'>
                    <UploadImg hidden />
                </Form.Item>
            )}

        </Form>
    );
};
export default observer(PreferencesBG);
