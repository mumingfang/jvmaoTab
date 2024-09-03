import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { Form, Select, Checkbox, Divider, Input, InputNumber } from "antd";
import { useDebounceFn } from 'ahooks';
import useStores from "~/hooks/useStores";
import _ from "lodash";

const SystemData = () => {
    const { option } = useStores();
    const _option = _.cloneDeep(option.item);

    const { systemTheme, showHomeClock, tabTitle, homeImgOpacity = 0.2 } = _option;

    const handleChange = React.useCallback((value) => {
        for (const key in value) {
            const v = value[key];
            option.setItem(key, v);
        }
    }, []);

    const { run } = useDebounceFn(
        (v) => handleChange(v),
        {
            wait: 200,
        },
    );

    return (
        <Form
            name="so"
            layout="vertical"
            initialValues={{
                systemTheme,
                showHomeClock,
                tabTitle,
                homeImgOpacity,
            }}
            onValuesChange={run}
        >
            <Form.Item label="主题" name='systemTheme'>
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={[
                        { value: 'auto', label: '跟随系统' },
                        { value: 'white', label: '亮色' },
                        { value: 'dark', label: '暗色' },
                    ]}
                />
            </Form.Item>
            <Divider />
            <Form.Item label="暗色模式壁纸透明度" name='homeImgOpacity'>
                <InputNumber
                    min="0.1"
                    max="1"
                    step="0.1"
                    precision="1"
                    style={{
                        width: '100%',
                    }}
                />
            </Form.Item>
            <Divider />
            <Form.Item label="标签页标题" name='tabTitle'>
                <Input />
            </Form.Item>
            <Divider />
            <Form.Item name='showHomeClock' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >首屏显示时间和日期</Checkbox>
            </Form.Item>
        </Form>
    );
};
export default observer(SystemData);
