import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Modal, theme, Divider, Segmented } from "antd";
import styled from "styled-components";
import PreferencesBG from "./bg"
import PreferencesLink from "./link"
import PreferencesSo from "./so"
import PreferencesData from "./data"
import SystemData from "./system"
import WebDAV from "./webDAV"


const Wrap = styled.div`
    padding: 20px 24px;
    max-height: 540px;
    min-height: 300px;
    overflow-y: auto;
`;

const NavWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 0px 0px 20px;
`;

const options = [
  {
    label: '系统',
    value: 'system',
  },
  {
    label: '壁纸',
    value: 'wallpaper',
  }, {
    label: '搜索',
    value: 'search',
  }, {
    label: '抽屉',
    value: 'drawer',
  }, {
    label: '数据',
    value: 'data',
  }, {
    label: 'WebDAV',
    value: 'webDAV',
  }
]

const content = {
  wallpaper: <PreferencesBG />,
  search: <PreferencesSo />,
  drawer: <PreferencesLink />,
  data: <PreferencesData />,
  system: <SystemData />,
  webDAV: <WebDAV />,
}

const Preferences = () => {
  const { tools, option } = useStores();
  const [activeType, setActiveType] = React.useState('wallpaper');
  const { systemTheme } = option.item;

  const getSystemTheme = React.useCallback(() => option.getSystemTheme(), [systemTheme]);

  const onclose = React.useCallback(() => {
    tools.preferencesOpen = false;
  }, []);

  return (
    <Modal
      title="首选项"
      centered
      maskStyle={{
        backdropFilter: "blur(10px)",
      }}
      wrapClassName={`preferences-modal ${getSystemTheme()}`}
      open={tools.preferencesOpen}
      onOk={onclose}
      onCancel={onclose}
      footer={null}
      destroyOnClose={true}
      // maskClosable={false}
      // keyboard={false}
      width={420}
    >
      <Wrap className="scroll-container">
        <NavWrap>
          <Segmented
            options={options}
            value={activeType} onChange={setActiveType}
          />
        </NavWrap>
        {content[activeType]}
      </Wrap>
    </Modal>
  );
};
export default observer(Preferences);
