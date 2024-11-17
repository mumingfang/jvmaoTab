import React from "react";
import styled from "styled-components";
import { observer } from "mobx-react";
import { theme, Button, Tooltip, Image } from "antd";
import { useLocation } from "react-router-dom";
import useStores from "~/hooks/useStores";
import { IconCirclePlus, IconEditCircle } from "@tabler/icons-react";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { useUpdateEffect, useHover, useMemoizedFn, useCreation } from "ahooks";
import HomeNote from "~/scenes/note/homeNote";
import logoPng from "~/assets/logo.png";
import LinkItemSmall from "~/scenes/Link/LinkItemSmall";
import HomeSearch from "~/components/HomeSearch";
import Clock from "~/components/Clock";
import _ from "lodash";


const { useToken } = theme;

const FirstScreenImgBg = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.backgroundColor};
  .ant-image {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .ant-image-img {
    object-fit: cover;
    opacity: var(--homeImgOpacity);
  }
  .ant-image-placeholder{
    &:before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      backdrop-filter: blur(20px);
      z-index: 10;
    }
  }
`;
const ImgWrap = styled(motion.div)`
`;

const HeaderWrap = styled(motion.div)`
  width: 100%;
  height: ${(props) => props.height};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--fff);
  border-bottom: 1px solid var(--borderColor);
`;
const SearchWrap = styled(motion.div)`
  height: ${(props) => props.height};
  position: absolute;
  z-index: 50;
`;
const ClockWrap = styled(motion.div)`
  position: absolute;
  z-index: ${(props) => props.stickled ? "-1" : "50"};
  left: 50%;
  top: calc(${(props) => (props.isSoBarDown ? "85vh + 100px" : "30vh - 140px")});
  transform: translateX(-50%) ${(props) => (props.isSoBarDown ? "translateY(-100%)" : "")};
  transition: transform 0.3s, top 0.3s, bottom 0.3s, z-index: 0.8s;
  width: 500px;
  display: flex;
  justify-content: center;
  -webkit-user-select: none;
  -moz-user-select: none; 
  -ms-user-select: none; 
  user-select: none; 
`;
const ClockContent = styled(motion.div)``;

const LogoWrap = styled.div`
  width: ${(props) => props.navWidth}px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
  color: #000;
  position: relative;
  overflow: hidden;
  opacity: var(--homeLogoOpacity);
  svg {
    width: 24px;
    height: 24px;
  }
  cursor: pointer;
`;
const LogoIconWrap = styled(motion.div)`
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  > div {
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;
const NavRight = styled.div`
  display: flex;
  align-items: center;
  margin-right: 20px;
`;
const HomeLinkNav = styled.div`
  position: absolute;
  z-index: ${(props) => props.stickled ? "-1" : "50"};
  left: 50%;
  top: calc(${(props) => (props.isSoBarDown ? "85vh - 10px" : "30vh + 60px")});
  transform: translateX(-50%) ${(props) => (props.isSoBarDown ? "translateY(-100%)" : "")};
  width: 500px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px 15px;
  padding: 15px;
  border-radius: 12px;
  transition: border-color 0.3s, background-color 0.3s, backdrop-filter 0.3s;
  border: 1px solid rgba(0, 0, 0, 0);
  -webkit-user-select: none;
  -moz-user-select: none; 
  -ms-user-select: none; 
  user-select: none; 
  &:hover {
    background-color: var(--homeNavBg);
    border-color: var(--homeNavBorderColor);
    backdrop-filter: saturate(180%) blur(20px);
  }
`;
const clockAnimations = {
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "backIn" },
  },
  hidden: {
    opacity: 0,
    y: '100%',
    scale: 1,
    transition: { duration: 0.3, ease: "linear" },
  },
  bg2Show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.16, ease: "backIn" },
  },
  bg2Hidden: {
    opacity: 0,
    scale: 0.5,
    y: 0,
    transition: { duration: 0.16, ease: "easeOut" },
  }
};
const bgAnimations = {
  show: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  }
};
const bg2Animations = {
  show: {
    opacity: 1,
    filter: "blur(0px)",
  },
  hidden: {
    opacity: 0,
    filter: "blur(10px)",
  }
};
const headerAnimations = {
  show: {
    y: 0,
  },
  hidden: {
    y: '-100%',
  }
};

const FirstScreen = (props) => {
  const { handleUnlock, unlock, showTopIcon } = props;

  const { home, tools, note, option, link } = useStores();
  const { isSoBarDown, homeLinkTimeKey, bgColor, bgType, showHomeClock, homeLinkMaxNum = 14, soHdCenter } = option.item;
  const searchWrapController = useAnimationControls();
  const clockWrapController = useAnimationControls();

  const { token } = useToken();
  const location = useLocation();
  const [homeLink, setHomeLink] = React.useState([]);
  const [showHomeLink, setShowHomeLink] = React.useState(!unlock);

  const logoIconRef = React.useRef(null);
  const isLogoIconHovering = useHover(logoIconRef);

  const searchAnimations = useMemoizedFn(() => {
    return {
      center: {
        x: "-50%",
        top: isSoBarDown ? "85vh" : "30vh",
        left: "50%",
        opacity: 1,
        transition: { duration: 0.2, ease: "easeOut" },
      },
      topInit: (props) => ({
        x: soHdCenter ? '-50%' : 0,
        top: "-50px",
        left: soHdCenter ? "50%" : props.navWidth,
        opacity: 0,
        transition: { duration: 0.2, ease: "backIn" },
      }),
      topOut: (props) => ({
        x: "-50%",
        top: "50vh",
        left: "50%",
        opacity: 0,
        transition: { duration: 0.3, ease: "easeIn" },
      }),
      top: (props) => ({
        x: soHdCenter ? '-50%' : 0,
        top: (props.headerHeight - 48) / 2,
        left: soHdCenter ? "50%" : props.navWidth,
        opacity: 1,
        transition: { duration: 0.2, ease: "linear" },
      }),
    }
  }, [isSoBarDown, soHdCenter])

  const changeSoBarDown = useMemoizedFn(() => {
    if (!unlock) {
      searchWrapController.start("topOut").then(() => {
        searchWrapController.start("center");
      });
    }
  }, [unlock])


  const bgImg = useCreation(() => {
    return (
      <FirstScreenImgBg
        backgroundColor={bgType === "color" ? bgColor : ''}
        animate={{
          opacity: unlock ? 0 : 1,
        }}
        transition={{ duration: 0.6, ease: "backIn" }}
      >
        {home.bgUrl ? (
          <ImgWrap
            initial={'show'}
            animate={home.bg2Url && home.isBg2 ? 'hidden' : "show"}
            variants={bgAnimations}
          >
            <Image
              width={"100vw"}
              height={"100vh"}
              src={home.bgUrl}
              preview={false}
              placeholder={
                <Image
                  preview={false}
                  src={home.bgThumbnailUrl}
                  className="bgThumbnai"
                  width={"100vw"}
                  height={"100vh"}
                />
              }
            />
          </ImgWrap>
        ) : null}

        {home.bg2Url ? (
          <ImgWrap
            initial={'hidden'}
            animate={home.isBg2 ? 'show' : "hidden"}
            variants={bg2Animations}
          >
            <Image
              width={"100vw"}
              height={"100vh"}
              src={home.bg2Url}
              preview={false}
            />
          </ImgWrap>

        ) : null}
      </FirstScreenImgBg>
    )

  }, [bgType, bgColor, home.bgUrl, home.bgUrl, home.isBg2, unlock, home.bgThumbnailUrl])

  React.useEffect(() => {
    if (!home.bgUrl) {
      home.onLoadBg();
    }
  }, [home.bgUrl]);

  useUpdateEffect(() => {
    if (unlock) {
      setShowHomeLink(false);
      searchWrapController.start("topOut").then(() => {
        clockWrapController.start("hidden");
        searchWrapController.start("topInit").then(() => {
          searchWrapController.start("top");
        });
      });
    } else {
      searchWrapController.start("topInit").then(() => {
        searchWrapController.start("topOut").then(() => {
          searchWrapController.start("center");
          clockWrapController.start("show");
          setShowHomeLink(true);
        });
      });
    }
  }, [unlock]);


  useUpdateEffect(() => {
    changeSoBarDown();
  }, [isSoBarDown])

  React.useEffect(() => {
    if (!unlock && homeLinkTimeKey && !home.isBg2) {
      link.getLinkByParentId(homeLinkTimeKey).then((res) => {
        const list = res.sort((a, b) => {
          return a.sort - b.sort;
        });
        setHomeLink(_.take(list, homeLinkMaxNum));
      })
    } else {
      setHomeLink([]);
    }
  }, [homeLinkTimeKey, unlock, home.isBg2, homeLinkMaxNum, tools.timeKey])

  React.useEffect(() => {
    if (home.isBg2) {
      clockWrapController.start("bg2Hidden");
    } else {
      clockWrapController.start("bg2Show");
    }
  }, [home.isBg2])

  return (
    <>
      {bgImg}
      <HeaderWrap
        height={`${props.headerHeight}px`}
        initial={unlock ? 'show' : "hidden"}
        animate={unlock ? 'show' : "hidden"}
        variants={headerAnimations}
        transition={{ duration: 0.5, ease: "backIn" }}
      >
        <LogoWrap
          ref={logoIconRef}
          navWidth={props.navWidth}
          onClick={() => {
            handleUnlock();
          }}
        >
          <LogoIconWrap
            style={{
              y: "0",
            }}
            animate={{
              y:
                showTopIcon || isLogoIconHovering
                  ? `-${props.headerHeight}px`
                  : "0",
            }}
          >
            <div
              style={{
                height: props.headerHeight,
              }}
            >
              <img style={{ height: "45px", width: "45px" }} src={logoPng} alt="橘猫起始页" />
            </div>
            <div
              style={{
                height: props.headerHeight,
                color: token.colorPrimary,
              }}
            >
              <svg
                viewBox="0 0 1024 1024"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
              >
                <path fill="currentColor" d="M512.075616 978.448399C254.405694 978.448399 45.551601 769.594306 45.551601 512S254.405694 45.551601 512.075616 45.551601C769.594306 45.551601 978.448399 254.405694 978.448399 512S769.594306 978.448399 512.075616 978.448399z"></path>
                <path
                  d="M356.516897 667.482192 512 512l155.483103 155.483103L745.224199 589.742007l-233.224199-233.224199-233.224199 233.224199L356.516897 667.482192z"
                  fill="#FFFFFF"
                ></path>
              </svg>
            </div>
          </LogoIconWrap>
        </LogoWrap>
        <NavRight>
          {location.pathname == '/' ? (
            <Tooltip placement="bottom" title={"新增链接"}>
              <Button
                type="text"
                onClick={() => (tools.tabListDrawer = true)}
                icon={<IconCirclePlus size={22} stroke={1} />}
              ></Button>
            </Tooltip>
          ) : location.pathname == '/note' ? (
            <Tooltip placement="bottom" title={"新增便签"}>
              <Button
                type="text"
                onClick={() => { note.open(0) }}
                icon={<IconEditCircle size={22} stroke={1} />}
              ></Button>
            </Tooltip>
          ) : null}

        </NavRight>
      </HeaderWrap>
      {showHomeClock ? (
        <ClockWrap
          isSoBarDown={isSoBarDown}
          stickled={unlock}
        >
          <ClockContent
            initial={!unlock ? 'show' : "hidden"}
            animate={clockWrapController}
            variants={clockAnimations}
          >
            <Clock isSoBarDown={isSoBarDown} />
          </ClockContent>
        </ClockWrap>
      ) : null}
      <SearchWrap
        custom={props}
        initial={unlock ? 'top' : "center"}
        variants={searchAnimations()}
        animate={searchWrapController}
      >
        <HomeSearch stickled={unlock} />
      </SearchWrap>
      {homeLinkTimeKey && homeLink?.length ? (
        <HomeLinkNav isSoBarDown={isSoBarDown} stickled={unlock} >
          <AnimatePresence>
            {showHomeLink && homeLink.map((v) => {
              return (
                <div key={v.timeKey}>
                  <LinkItemSmall
                    isSoBarDown={isSoBarDown}
                    {...v}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </HomeLinkNav>
      ) : null}
      <HomeNote stickled={unlock} />
    </>
  );
};

export default observer(FirstScreen);
