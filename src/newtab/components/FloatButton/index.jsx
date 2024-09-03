import React from "react";
import { observer } from "mobx-react";
import { FloatButton } from "antd";
import { IconSquareRoundedPlus, IconMailbox } from "@tabler/icons-react";


const FloatBtn = (props) => {
    return (
        <FloatButton.Group shape="circle" style={{ right: 34 }}>
            <FloatButton icon={<IconSquareRoundedPlus />} />
            <FloatButton icon={<IconMailbox />} />
        </FloatButton.Group>
    );
};
export default observer(FloatBtn);