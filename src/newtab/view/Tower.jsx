import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { message, ConfigProvider, theme } from "antd";
import useStores from "~/hooks/useStores";
import { useDocumentVisibility } from 'ahooks';
import PublicModal from "~/scenes/Public/PublicModal";
import styled, { createGlobalStyle } from "styled-components";
import { IconCloudUpload, IconCloudDownload } from "@tabler/icons-react";
import _ from "lodash";

const { useToken } = theme;

const Wrap = createGlobalStyle`
 body {
  --maxWidth: 1500px;
  --bgColor: ${(props) => props.color.bgColor};
  --fff: ${(props) => props.color.fff};
  --borderColor: ${(props) => props.color.borderColor};
  --colorText: ${(props) => props.color.colorText};
  --PrimaryColor: #1890ff;
  --sn-font-hei: -apple-system, "Noto Sans", "Helvetica Neue", Helvetica,
    "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB",
    "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN",
    "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti",
    SimHei, "WenQuanYi Zen Hei Sharp", sans-serif;
  --searcBoxShadowStickled: ${(props) => props.color.searcBoxShadowStickled};
  --searcBoxShadow: ${(props) => props.color.searcBoxShadow};
  --homeImgOpacity: ${(props) => props.color.homeImgOpacity};
  --homeLogoOpacity: ${(props) => props.color.homeLogoOpacity};
  --homeNavBg: ${(props) => props.color.homeNavBg};
  --homeNavBorderColor: ${(props) => props.color.homeNavBorderColor};
  --linkitemGhostBg: ${(props) => props.color.linkitemGhostBg};
  --notebrColor: ${(props) => props.color.notebrColor};
  --notebrBoxShadow: ${(props) => props.color.notebrBoxShadow};
  --notebrHomeHeaderBg: ${(props) => props.color.notebrHomeHeaderBg};
  background-color: var(--bgColor);
  }
`;

const CloudWrap = styled.div`
  position: fixed;
  right: 20px;
  bottom: 10px;
  color: var(--colorText);
  z-index: 999;
  animation: jv-blink 2s step-start 0s infinite;
`;

const RightClick = React.lazy(() => import("~/components/RightClick"));
const Preferences = React.lazy(() => import("~/scenes/preferences"));
// const FloatButton = React.lazy(() => import("~/components/FloatButton"));
const Tower = ({ children }) => {
  const { link, tools, note, option, data } = useStores();
  const [messageApi, contextHolder] = message.useMessage();
  const { systemTheme, tabTitle, homeImgOpacity = 0.2 } = option.item;
  const { token } = useToken();

  const v = React.useRef({
    isInit: false
  }).current;

  const documentVisibility = useDocumentVisibility();

  const getTheme = useCallback(() => {
    let isDark = option.getSystemTheme() === 'dark';;

    const t = {
      cssVar: true,
      token: {
        colorPrimary: '#e06400',
      },
    }
    if (isDark) {
      t.algorithm = theme.darkAlgorithm;
    }
    return t;
  }, [systemTheme]);

  const getMyTheme = useCallback(() => {
    let isDark = option.getSystemTheme() === 'dark';
    const t = {
      isDark,
    }
    if (isDark) {
      t.bgColor = '#1a1a1a';
      t.fff = '#1f1f1f';
      t.borderColor = 'rgba(253, 253, 253, 0.12)';
      t.colorText = 'rgba(255, 255, 255, 0.65)';
      t.searcBoxShadowStickled = "rgb(235 235 235) 0px 0px 2px -1px"
      t.searcBoxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)"
      t.homeImgOpacity = homeImgOpacity || "0.2"
      t.linkitemGhostBg = "#515151";
      t.notebrColor = "rgba(222, 222, 222, 0.12)";
      t.notebrBoxShadow = "rgb(20, 20, 20)";
      t.notebrHomeHeaderBg = "#181818";
      t.homeLogoOpacity = "0.75";
      t.homeNavBg = 'rgba(0, 0, 0, 0.18)';
      t.homeNavBorderColor = 'rgba(0, 0, 0, 0.2)';

    } else {
      t.bgColor = token.colorBgLayout;
      t.fff = token.colorBgContainer;
      t.borderColor = '#ddd';
      t.colorText = token.colorText;
      t.searcBoxShadowStickled = "rgb(0 0 0) 0px 0px 2px -1px"
      t.searcBoxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)"
      t.homeImgOpacity = "1"
      t.linkitemGhostBg = "rgb(230, 233, 236)";
      t.notebrColor = "rgb(238, 238, 238)";
      t.notebrBoxShadow = "rgb(233, 233, 233)";
      t.notebrHomeHeaderBg = "#f5f5f5";
      t.homeLogoOpacity = "1";
      t.homeNavBg = 'rgba(255, 255, 255, 0.18)';
      t.homeNavBorderColor = 'rgba(255, 255, 255, 0.2)';
    }
    return t;
  }, [systemTheme, homeImgOpacity]);

  const restart = useCallback(_.debounce(() => {
    tools.updateTimeKey();
    link.restart();
    note.init();
  }, 300), []);

  React.useEffect(() => {
    if (documentVisibility === 'visible' && v.isInit) {
      restart();
    }
  }, [documentVisibility]);

  React.useEffect(() => {
    tools.messageApi = messageApi;
    link.restart();
    note.init();
    v.isInit = true;
    document.addEventListener('contextmenu', function (e) {
      if (!e.target.classList.contains("search-input")) {
        // 阻止默认的右键菜单弹出
        e.preventDefault();
      }
    });

    window.addEventListener('focus', function () {
      restart();
    });

  }, []);

  React.useEffect(() => {
    if (tabTitle) {
      document.title = tabTitle;
    }
  }, [tabTitle]);

  if (!option.isInit) {
    return null;
  }

  const myTheme = getMyTheme();

  return (
    <div className={`${myTheme.isDark ? 'isDark' : ''}`}>
      <Wrap color={myTheme} />
      <ConfigProvider
        theme={getTheme()}
      >
        <>{children}</>
        {contextHolder}
        {/* <FloatButton /> */}
        <RightClick />
        <Preferences />
        <PublicModal />
        {data.waitType ? (
          <CloudWrap>
            {data.waitType === 'pull' ? <IconCloudDownload size={18} stroke={0.8} /> : <IconCloudUpload size={18} stroke={0.8} />}
          </CloudWrap>
        ) : null}
      </ConfigProvider>
    </div>
  );
};
export default observer(Tower);
