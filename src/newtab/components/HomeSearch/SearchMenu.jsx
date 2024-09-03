import React from "react";
import { observer } from "mobx-react";
import { SoIcon } from "../../../SearchIcon";
import _ from "lodash";
import {
  useControllableValue,
  useKeyPress,
  useCreation,
  useWhyDidYouUpdate,
} from "ahooks";
import { Button, Dropdown } from "antd";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import FavIconIcon from "~/scenes/public/FavIconIcon";

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

const SearchMenu = (props) => {
  const { option } = useStores();
  const { customkey = [] } = option.item;
  const [state, setState] = useControllableValue(props);
  const { isFocus } = props;

  const List = useCreation(() => {
    const soList = [...customkey, ...SoIcon];
    return (option.item.soList || []).map(k => soList.find(v => v?.key && v.key === k)).filter(Boolean);
  }, [option.item.soList, SoIcon, customkey]);

  const key = useCreation(() => {
    return List.map((item, index) => {
      if (index >= 9) {
        return "";
      }
      return "alt." + (index + 1);
    });
  }, [List]);

  const changeNext = React.useCallback(() => {
    const index = List.findIndex((item) => item.key === state);
    const next = List[(index + 1) % List.length];
    setState(next?.key);
  }, [state])

  useKeyPress(
    key,
    (event) => {
      setState(List[event.key - 1].key);
    },
    {
      exactMatch: true,
    }
  );

  useKeyPress(
    "tab",
    (e) => {
      if (isFocus) {
        e.preventDefault();
        changeNext();
      }
    },
    {
      exactMatch: true,
    }
  );

  const soMenu = useCreation(() => {
    return List.map((item, index) => {
      return {
        key: item?.key,
        label: (
          <MenuItemWrap>
            <span>{item.name}</span>
            {index < 9 ? <i>Alt + {index + 1}</i> : null}
          </MenuItemWrap>
        ),
        icon: item.icon ? item.icon : <FavIconIcon size={24} url={item?.url} style={{ marginRight: 8 }} onlyDomain />,
      };
    });
  }, [List]);

  const SelectIcon = useCreation(() => {
    const v = List.find((v) => v.key === state);
    if (!v) {
      setState(List[0].key);
      option.setItem('activeSo', List[0].key);
      return null;
    }
    if (!v?.icon) {
      return <FavIconIcon size={24} url={v?.url} onlyDomain />;
    }
    return v.icon;
  }, [List, state]);

  return (
    <Dropdown
      menu={{
        items: soMenu,
        onClick: (props) => setState(props.key)
      }}
      placement="bottomLeft"
      onOpenChange={props.onDropDownClick}
      trigger={["click"]}
      overlayClassName={"search-menu-dropdown"}
      autoAdjustOverflow={true}
    >
      <Button
        type="text"
        shape="circle"
        icon={SelectIcon}
      />
    </Dropdown>
  );
};
export default observer(SearchMenu);
