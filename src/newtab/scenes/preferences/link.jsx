import React from "react";
import { observer } from "mobx-react";
import { Form, Checkbox, Select, Divider } from "antd";
import useStores from "~/hooks/useStores";
import UploadImg from "~/components/UploadImg";
import _ from "lodash";

const options = [
    {
        label: '4个',
        value: 4,
    }, {
        label: '6个',
        value: 6,
    }, {
        label: '8个',
        value: 8,
    }
];

const homeLinkMaxNumOption = [
    {
        label: '一行',
        value: 7,
    },
    {
        label: '两行',
        value: 14,
    },
    {
        label: '三行',
        value: 21,
    },
    {
        label: '四行',
        value: 28,
    },
    {
        label: '五行',
        value: 35,
    },

];

const PreferencesLink = () => {
    const { option } = useStores();
    const _option = _.cloneDeep(option.item);
    const { linkSpan, copyClose, defaultOpenAdd, defauiltLink, linkOpenSelf, showLinkNav, homeLinkMaxNum, rollingBack } = _option;

    const handleChange = (value) => {
        for (const key in value) {
            const v = value[key];
            option.setItem(key, v);
        }
    };
    return (
        <Form
            name="basic"
            layout="vertical"
            initialValues={{
                linkSpan,
                copyClose,
                defaultOpenAdd,
                defauiltLink,
                linkOpenSelf,
                showLinkNav,
                homeLinkMaxNum,
                rollingBack
            }}
            onValuesChange={handleChange}
        >
            <Form.Item label="每行展示链接数" name='linkSpan' >
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={options}
                />
            </Form.Item>
            <Divider />
            <Form.Item label="首屏快捷链接最大行数" name='homeLinkMaxNum'>
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={homeLinkMaxNumOption}
                />
            </Form.Item>
            <Divider />

            <Form.Item name='defaultOpenAdd' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox>默认打开新增列表</Checkbox>
            </Form.Item>
            {/* <Divider /> */}
            <Form.Item name='copyClose' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >新增链接后关闭页面</Checkbox>
            </Form.Item>
            {/* <Divider /> */}
            <Form.Item name='defauiltLink' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >默认展示抽屉</Checkbox>
            </Form.Item>
            {/* <Divider /> */}
            <Form.Item name='linkOpenSelf' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >链接在当前标签页中打开</Checkbox>
            </Form.Item>
            <Form.Item name='showLinkNav' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >在页脚里显示导航</Checkbox>
            </Form.Item>
            <Form.Item name='rollingBack' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >支持滚动返回首屏</Checkbox>
            </Form.Item>
        </Form>
    );
};
export default observer(PreferencesLink);
