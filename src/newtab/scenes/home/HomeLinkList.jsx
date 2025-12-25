import React from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { AnimatePresence } from "framer-motion";
import { ReactSortable } from "react-sortablejs";
import { useMemoizedFn } from "ahooks";
import useStores from "~/hooks/useStores";
import useDebounce from "~/hooks/useDebounce";
import LinkItemSmall from "~/scenes/Link/LinkItemSmall";
import { filterLinkList } from "~/utils";
import _ from "lodash";

const HomeLinkNav = styled.div`
  position: absolute;
  z-index: ${(props) => props.stickled ? "-1" : "50"};
  left: 50%;
  top: calc(${(props) => (props.isSoBarDown ? "85vh - 10px" : "30vh + 60px")});
  transform: translateX(-50%) ${(props) => (props.isSoBarDown ? "translateY(-100%)" : "")};
  width: 500px;
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

const SortableContainer = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px 15px;
  width: 100%;
`;

const SortableWrapper = React.forwardRef((props, ref) => {
  return <SortableContainer ref={ref}>{props.children}</SortableContainer>;
});

const HomeLinkListComponent = (props) => {
  const { homeLink, homeLinkTimeKey, isSoBarDown, stickled, showHomeLink } = props;
  const { link } = useStores();
  const [linkList, setLinkList] = React.useState([]);

  // 同步外部传入的 homeLink 到内部 state
  React.useEffect(() => {
    if (homeLink && Array.isArray(homeLink)) {
      setLinkList([...homeLink]);
    } else {
      setLinkList([]);
    }
  }, [homeLink]);

  // 防抖保存排序
  const onUpdateSort = useDebounce((value) => {
    if (!homeLinkTimeKey || !value || value.length === 0) {
      return;
    }
    // 使用 filterLinkList 更新 sort 字段
    const updatedList = filterLinkList(value, homeLinkTimeKey);
    
    // 像 LinkPanel 的 setLinkItem 一样，更新 link.list
    // 删除 link.list 中 parentId 相同的数据
    _.remove(link.list, (v) => v.parentId === homeLinkTimeKey);
    // 添加新的排序后的数据
    link.list.push(...Array.from(updatedList));
    
    // 保存到数据库
    link.updateLink(updatedList).then(() => {
      setTimeout(() => {
        link.setCache();
      }, 0);
    });
  }, 150);

  // 处理拖拽排序
  const handleSort = useMemoizedFn((newList) => {
    setLinkList(newList);
    onUpdateSort(newList);
  }, [onUpdateSort]);

  // 如果没有链接或条件不满足，不渲染
  if (!homeLinkTimeKey || !linkList || !Array.isArray(linkList) || linkList.length === 0) {
    return null;
  }

  return (
    <HomeLinkNav
      isSoBarDown={isSoBarDown}
      stickled={stickled}
      
    >
      <ReactSortable
        tag={SortableWrapper}
        list={linkList}
        setList={handleSort}
        animation={150}
        ghostClass="home-link-ghost"
      >
        <AnimatePresence>
          {showHomeLink && linkList.map((v) => {
            if (!v || !v.timeKey) {
              return null;
            }
            return (
              <div key={v.timeKey}>
                <LinkItemSmall
                  isSoBarDown={isSoBarDown}
                  {...v}
                  className={props.glassMode ? 'glass-card' : ''}
                />
              </div>
            );
          })}
        </AnimatePresence>
      </ReactSortable>
    </HomeLinkNav>
  );
};

const HomeLinkList = React.memo(observer(HomeLinkListComponent));

export default HomeLinkList;

