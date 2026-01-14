import React from "react";
import styled from "styled-components";
import { observer } from "mobx-react";
import { theme, Button, Tooltip, Badge } from "antd";
import { useLocation } from "react-router-dom";
import useStores from "~/hooks/useStores";
import { IconCirclePlus, IconEditCircle } from "@tabler/icons-react";
import { motion, useAnimationControls } from "framer-motion";
import { useUpdateEffect, useHover, useMemoizedFn, useCreation } from "ahooks";
import HomeNote from "~/scenes/note/homeNote";
import logoPng from "~/assets/logo.png";
import HomeLinkList from "./HomeLinkList";
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
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: ${(props) => props.bg1Url ? `url(${props.bg1Url})` : 'none'};
    background-repeat: ${(props) => {
      switch (props.bg1ImageFit) {
        case 'center':
          return 'repeat';
        default:
          return 'no-repeat';
      }
    }};
    background-position: ${(props) => {
      switch (props.bg1ImageFit) {
        case 'center':
          return 'center top';
        default:
          return 'center center';
      }
    }};
    background-size: ${(props) => {
      switch (props.bg1ImageFit) {
        case 'width100':
          return '100% auto';
        case 'height100':
          return 'auto 100%';
        case 'center':
          return 'auto';
        case 'cover':
        default:
          return 'cover';
      }
    }};
    opacity: ${(props) => props.showBg1 ? 'var(--homeImgOpacity)' : '0'};
    transition: opacity 0.3s ease;
    filter: ${(props) => props.bg1Blur ? 'blur(10px)' : 'none'};
  }
  
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: ${(props) => props.bg2Url ? `url(${props.bg2Url})` : 'none'};
    background-repeat: ${(props) => {
      switch (props.bg2ImageFit) {
        case 'center':
          return 'repeat';
        default:
          return 'no-repeat';
      }
    }};
    background-position: ${(props) => {
      switch (props.bg2ImageFit) {
        case 'center':
          return 'center top';
        default:
          return 'center center';
      }
    }};
    background-size: ${(props) => {
      switch (props.bg2ImageFit) {
        case 'width100':
          return '100% auto';
        case 'height100':
          return 'auto 100%';
        case 'center':
          return 'auto';
        case 'cover':
        default:
          return 'cover';
      }
    }};
    opacity: ${(props) => props.showBg2 ? 'var(--homeImgOpacity)' : '0'};
    transition: opacity 0.16s ease, filter 0.16s ease;
    filter: ${(props) => {
      if (!props.showBg2) return 'none';
      // 第二壁纸默认模糊，只有在激活时才清晰
      return props.isBg2Active ? 'blur(0px)' : 'blur(10px)';
    }};
  }
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
const headerAnimations = {
  show: {
    y: 0,
  },
  hidden: {
    y: '-100%',
  }
};

// 获取图片尺寸
const getImageSize = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
};

// 根据图片尺寸智能判断展示方式
const getAutoImageFit = async (url) => {
  if (!url) return 'cover';
  try {
    const { width, height } = await getImageSize(url);
    // 如果高度大于宽度（竖图），使用 height100，否则使用 cover
    return height > width ? 'height100' : 'cover';
  } catch (error) {
    console.error('Failed to get image size:', error);
    return 'cover'; // 出错时默认使用 cover
  }
};

const FirstScreen = (props) => {
  const { handleUnlock, unlock, showTopIcon } = props;

  const { home, tools, note, option, link } = useStores();
  const { isSoBarDown, homeLinkTimeKey, bgColor, bgType, showHomeClock, homeLinkMaxNum = 14, soHdCenter, bgImageFit = 'cover', bg2ImageFit = 'cover', homeGlassEffect } = option.item;
  
  // 智能选择显示 URL：
  // - 如果 bgUrl 是本地 Blob URL（blob: 开头），优先使用它（最清晰）
  // - 否则使用缩略图（更快加载）
  // - 都没有时使用 bgUrl
  const bg1DisplayUrl = React.useMemo(() => {
    if (home.bgUrl?.startsWith('blob:')) {
      return home.bgUrl; // 本地 Blob 已准备好，用大图
    }
    return home.bgThumbnailUrl || home.bgUrl || null;
  }, [home.bgThumbnailUrl, home.bgUrl]);
  
  // 智能判断实际的展示方式（初始值：如果是 auto 则先用 cover，待图片加载后更新）
  const [actualBg1ImageFit, setActualBg1ImageFit] = React.useState(bgImageFit === 'auto' ? 'cover' : bgImageFit);
  const [actualBg2ImageFit, setActualBg2ImageFit] = React.useState(bg2ImageFit === 'auto' ? 'cover' : bg2ImageFit);
  const searchWrapController = useAnimationControls();
  const clockWrapController = useAnimationControls();

  const { token } = useToken();
  const location = useLocation();
  const [homeLink, setHomeLink] = React.useState([]);
  const [showHomeLink, setShowHomeLink] = React.useState(!unlock);
  const [pendingLinksCount, setPendingLinksCount] = React.useState(0);

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
  }, [unlock, searchWrapController])


  const bgImg = useCreation(() => {
    const showBg1 = bg1DisplayUrl && (!home.isBg2 || !home.bg2Url);
    const showBg2 = home.bg2Url && home.isBg2;
    
    return (
      <FirstScreenImgBg
        backgroundColor={bgType === "color" ? bgColor : ''}
        bg1ImageFit={actualBg1ImageFit}
        bg2ImageFit={actualBg2ImageFit}
        bg1Url={bg1DisplayUrl}
        bg2Url={home.bg2Url || null}
        showBg1={showBg1}
        showBg2={showBg2}
        isBg2Active={home.isBg2}
        bg1Blur={false}
        animate={{
          opacity: unlock ? 0 : 1,
        }}
        transition={{ duration: 0.6, ease: "backIn" }}
      />
    )

  }, [bgType, bgColor, actualBg1ImageFit, actualBg2ImageFit, bg1DisplayUrl, home.bg2Url, home.isBg2, unlock])

  // 智能判断第一壁纸的展示方式
  React.useEffect(() => {
    if (bgImageFit === 'auto' && bg1DisplayUrl) {
      getAutoImageFit(bg1DisplayUrl).then((fit) => {
        setActualBg1ImageFit(fit);
      });
    } else {
      setActualBg1ImageFit(bgImageFit);
    }
  }, [bgImageFit, bg1DisplayUrl]);

  // 智能判断第二壁纸的展示方式
  React.useEffect(() => {
    if (bg2ImageFit === 'auto' && home.bg2Url) {
      getAutoImageFit(home.bg2Url).then((fit) => {
        setActualBg2ImageFit(fit);
      });
    } else {
      setActualBg2ImageFit(bg2ImageFit);
    }
  }, [bg2ImageFit, home.bg2Url]);

  React.useEffect(() => {
    if (!home.bgUrl) {
      home.onLoadBg();
    }
  }, [home]);

  // 监听首次加载状态，显示初始化提示
  React.useEffect(() => {
    if (bgType === 'bing' && home.isFirstLoad && home.isLoadingWallpaper) {
      // 提示已经在 getBingBg() 中通过 messageApi 显示
      // 这里可以添加额外的UI提示如果需要
    }
  }, [bgType, home.isFirstLoad, home.isLoadingWallpaper]);

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
        if (res && Array.isArray(res)) {
          const list = res.sort((a, b) => {
            return a.sort - b.sort;
          });
          setHomeLink(_.take(list, homeLinkMaxNum));
        } else {
          setHomeLink([]);
        }
      }).catch((err) => {
        console.error('Failed to load home links:', err);
        setHomeLink([]);
      });
    } else {
      setHomeLink([]);
    }
  }, [homeLinkTimeKey, unlock, home.isBg2, homeLinkMaxNum, link])

  React.useEffect(() => {
    if (home.isBg2) {
      clockWrapController.start("bg2Hidden");
    } else {
      clockWrapController.start("bg2Show");
    }
  }, [home.isBg2])

  // 获取待添加网址数量
  React.useEffect(() => {
    const loadPendingLinksCount = () => {
      link.getPendingLinks().then((links) => {
        setPendingLinksCount(links?.length || 0);
      }).catch((err) => {
        console.error("Failed to load pending links count:", err);
        setPendingLinksCount(0);
      });
    };
    loadPendingLinksCount();
    // 定期刷新待添加网址数量
    const interval = setInterval(() => {
      loadPendingLinksCount();
    }, 1000);
    return () => clearInterval(interval);
  }, [link]);

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
            <Tooltip 
              placement="bottom" 
              title={pendingLinksCount > 0 ? `新增链接（${pendingLinksCount} 个待添加网址）` : "新增链接"}
            >
              <Badge count={pendingLinksCount > 0 ? pendingLinksCount : 0} offset={[-2, 2]}>
                <Button
                  type="text"
                  onClick={() => (tools.tabListDrawer = true)}
                  icon={<IconCirclePlus size={22} stroke={1} />}
                ></Button>
              </Badge>
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
        <HomeSearch stickled={unlock} className={homeGlassEffect ? 'glass-card' : ''} />
      </SearchWrap>
      <HomeLinkList
        homeLink={homeLink}
        homeLinkTimeKey={homeLinkTimeKey}
        isSoBarDown={isSoBarDown}
        stickled={unlock}
        showHomeLink={showHomeLink}
        glassMode={homeGlassEffect}
      />
      <HomeNote stickled={unlock} />
    </>
  );
};

export default observer(FirstScreen);
