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
    const { bgType, bgUrl, bgBase64, bg2Type, bg2Url, bg2Base64, bgColor, bgImageFit = 'cover', bg2ImageFit = 'cover' } = option.item;

    const handleChange = (value) => {
        if (!value || typeof value !== 'object') {
            return;
        }
        for (const key in value) {
            if (Object.hasOwnProperty.call(value, key)) {
                let v = value[key];

                switch (key) {
                    case 'bgColor':
                        if (v && typeof v.toHexString === 'function') {
                            v = v.toHexString();
                        }
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
            if (home && typeof home.onLoadBg === 'function') {
                home.onLoadBg();
            }
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
                bgImageFit,
                bg2ImageFit,
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
            {bgType !== 'color' && (
                <Form.Item label="壁纸展示方式" name='bgImageFit'>
                    <Select
                        size="large"
                        style={{ width: '100%' }}
                        options={[
                            { value: 'auto', label: '智能判断（竖图用高100%，横图用填充）' },
                            { value: 'cover', label: '填充（保持比例，裁剪多余部分）' },
                            { value: 'width100', label: '宽100% 高自动' },
                            { value: 'height100', label: '高100% 宽自动' },
                            { value: 'center', label: '垂直居中平铺' },
                        ]}
                    />
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
            {bg2Type !== 'null' && (
                <Form.Item label="第二壁纸展示方式" name='bg2ImageFit'>
                    <Select
                        size="large"
                        style={{ width: '100%' }}
                        options={[
                            { value: 'auto', label: '智能判断（竖图用高100%，横图用填充）' },
                            { value: 'cover', label: '填充（保持比例，裁剪多余部分）' },
                            { value: 'width100', label: '宽100% 高自动' },
                            { value: 'height100', label: '高100% 宽自动' },
                            { value: 'center', label: '垂直居中平铺' },
                        ]}
                    />
                </Form.Item>
            )}

        </Form>
    );
};
export default observer(PreferencesBG);
