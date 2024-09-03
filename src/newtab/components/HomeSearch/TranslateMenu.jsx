import React from "react";
import { observer } from "mobx-react";
import { TranslateIcon } from "../../../SearchIcon";
import _ from "lodash";
import {
  useControllableValue,
  useKeyPress,
  useCreation,
  useWhyDidYouUpdate,
} from "ahooks";
import { Button, Dropdown, Tooltip } from "antd";
import styled from "styled-components";
import useStores from "~/hooks/useStores";

const shiftKey = {
  "Digit1": 0,
  "Digit2": 1,
  "Digit3": 2,
  "Digit4": 3,
  "Digit5": 4,
  "Digit6": 5,
  "Digit7": 6,
  "Digit8": 7,
  "Digit9": 8,
  "Digit10": 9,
};

const MenuItemWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 160px;
  > i {
    font-size: 12px;
    color: #999;
    font-style: normal;
  }
`;
const translateList = ['Google', 'Baidu', 'DeepL', 'Bing'];
const TranslateMenu = (props) => {
  const { option } = useStores();
  const [state, setState] = useControllableValue(props);

  // useWhyDidYouUpdate("TranslateMenu", { ...props, state });

  const List = useCreation(() => {
    return (translateList || []).map((name) => {
      return TranslateIcon.find((v) => v.name === name);
    });
  }, [TranslateIcon]);

  const key = useCreation(() => {
    return List.map((item, index) => {
      return "shift.alt." + (index + 1);
    });
  }, [List]);

  useKeyPress(key, (event) => {

    setState(List[shiftKey[event.code]]?.name);
  });

  const menu = useCreation(() => {
    return List.map((item, index) => {
      return {
        key: item.name,
        label: (
          <MenuItemWrap>
            <span>{item.name}</span>
            <i>Alt + Shift + {index + 1}</i>
          </MenuItemWrap>
        ),
        icon: item.icon,
      };
    });
  }, [List]);

  return (
    <Dropdown
      menu={{
        items: menu,
        onClick: (props) => setState(props.key)
      }}
      placement="bottomRight"
      onOpenChange={props.onDropDownClick}
      trigger={["click"]}
      overlayClassName={"translate-menu-dropdown"}
      autoAdjustOverflow={true}
    >
      <Tooltip placement="right" title={'按快捷键 Alt + Enter 翻译'}>
        <Button
          type="text"
          shape="circle"
          icon={List.find((v) => v.name === state)?.icon}
        />
      </Tooltip>

    </Dropdown>
  );
};
export default observer(TranslateMenu);
