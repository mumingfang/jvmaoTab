import React from "react";
import { observer } from "mobx-react";
import { Form, Checkbox, Slider, Divider } from "antd";
import useStores from "~/hooks/useStores";
import SoSelect from "~/components/SoSelect";
import _ from "lodash";


const PreferencesSo = () => {
    const { option } = useStores();
    const _option = _.cloneDeep(option.item);
    const { soStyleIsRound, soList, soAOpen, activeSo, isSoBarDown, soHdCenter } = _option;

    const handleChange = (value) => {
        for (const key in value) {
            const v = value[key];
            if (key === 'soList' && !v.includes(activeSo)) {
                option.setItem('activeSo', v[0]);
            }
            option.setItem(key, v);
        }
    };

    return (
        <Form
            name="so"
            layout="vertical"
            initialValues={{
                soStyleIsRound,
                soList,
                soAOpen,
                isSoBarDown,
            }}
            onValuesChange={handleChange}
        >
            <Form.Item label="搜索引擎" name='soList' >
                <SoSelect />
            </Form.Item>
            <Divider />
            <Form.Item name='soAOpen' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox>搜索结果页导航点击后在新页面打开</Checkbox>
            </Form.Item>
            <Form.Item name='soStyleIsRound' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox>启用圆角搜索框</Checkbox>
            </Form.Item>
            <Form.Item name='isSoBarDown' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox>搜索框在首屏底部</Checkbox>
            </Form.Item>
            <Form.Item name='soHdCenter' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox>搜索框始终保持水平居中</Checkbox>
            </Form.Item>
        </Form>
    );
};
export default observer(PreferencesSo);
