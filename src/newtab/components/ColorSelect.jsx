import React from "react";
import { Divider, ColorPicker, Row, Col, theme } from "antd";
import { useControllableValue } from 'ahooks';
import styled from "styled-components";


const Wrap = styled.div`
    width: 100%;
    height: 40px;
    cursor: pointer;
    border-radius: 4px;
`;

const morandiColors = [
    // 红色系
    "#9D7A78", "#AD8B82", "#A47C7C", "#AE8D8D", "#BA9D9D",
    "#A18888", "#A58A8A", "#B4A3A3", "#B59E9E", "#C1B1B1",
    // 橙色系
    "#C0A18B", "#C1A68C", "#C8AE95", "#C5A992", "#D1B6A0",
    "#D6BFA9", "#D9C0A9", "#DCC3AC", "#E1C8B1", "#E0C7B0",
    // 黄色系
    "#D8C19C", "#D0BC95", "#DCCC9F", "#D8C7A0", "#E2D1AA",
    "#E5D4AD", "#E3D2AB", "#EADAB3", "#E8D8B1", "#E8D8B0",
    // 绿色系
    "#A9B1A1", "#B2BAAA", "#AAB2A3", "#BCC1B4", "#BCC1B3",
    "#B6BCAD", "#C0C7B7", "#C2C8B8", "#C9CFBF", "#C7CEBD",
    // 青色系
    "#A8B9B5", "#A3B4B0", "#ACC1BD", "#B5CAC7", "#B0C5C2",
    "#B3C8C5", "#BACFCB", "#AEC3BF", "#A1B6B2", "#A9BEB9",
    // 蓝色系
    "#A0AEC0", "#99A7B9", "#8E9DAD", "#8D9CAC", "#8C9BAB",
    "#A3B4C8", "#AABCCF", "#B2C3D4", "#A8B9CE", "#98A9BE",
    // 紫色系
    "#A99EAD", "#B7ACBB", "#B0A5B4", "#B9AEC0", "#B2A7B9",
    "#A89CB0", "#B5AFC1", "#BEB8CA", "#B8B2C3", "#AFA9BB"
];
const presets = [{
    label: '纯色',
    colors: morandiColors,
}];

const ColorSelect = (props) => {
    const { token } = theme.useToken();
    const [value, onChange] = useControllableValue(props);
    const customPanelRender = (_, { components: { Picker, Presets } }) => (
        <Row justify="space-between" wrap={false}>
            <Col span={12}>
                <Presets />
            </Col>
            <Divider
                type="vertical"
                style={{
                    height: 'auto',
                }}
            />
            <Col flex="auto">
                <Picker />
            </Col>
        </Row>
    );
    return (
        <ColorPicker
            value={value}
            onChange={onChange}
            defaultValue={token.colorPrimary}
            styles={{
                popupOverlayInner: {
                    width: 480,
                },
            }}
            presets={presets}
            panelRender={customPanelRender}
        >
            <Wrap style={{ backgroundColor: typeof value === 'string' ? value : value?.toHexString() }} />
        </ColorPicker>
    );
};

export default ColorSelect;
