import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import cx from 'classnames';
import { AutoComplete, Input, Divider } from "antd";
import {
  useReactive,
  useCreation,
  useMemoizedFn,
  useWhyDidYouUpdate,
  useKeyPress,
} from "ahooks";
import styled from "styled-components";
import api from "~/utils/api";
import { SoIcon, TranslateIcon } from "../../../SearchIcon";
import SearchMenu from "./SearchMenu";
import TranslateMenu from "./TranslateMenu";
import FavIconIcon from "~/scenes/public/FavIconIcon";
import _ from "lodash";

const AutoCompleteWrap = styled(AutoComplete)`
  width: 584px;
  --ant-control-height: 48px;
`;
const SearchWrap = styled.div`
  background: var(--fff);
  box-sizing: border-box;
  padding: ${(props) => (props.isRound ? "0 8px" : "0 5px")};
  border-radius: ${(props) => (props.isRound ? "38px" : "8px")};
  display: flex;
  align-items: center;
  height: 48px;
  box-shadow: ${(props) => (props.stickled ? "var(--searcBoxShadowStickled)" : "var(--searcBoxShadow)")};
  opacity: 1;
  transition: box-shadow 0.3s ease-in-out, opacity 0.3s ease-in-out;
  &.hidden {
    opacity: 0.3;
    box-shadow: none;
  }
`;
const SearchInput = styled.div`
  flex: 1;
  > input {
    padding: 0 0 0 8px;
  }
`;
const SearchLinkItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 8px;
`;

const HomeSearch = (props) => {
  const { option, home, link } = useStores();
  const { isSoBarDown, linkOpenSelf, customkey } = option.item
  const { stickled } = props;
  const inputRef = React.useRef(null);
  const [inputFocus, setInputFocus] = React.useState(false);

  const state = useReactive(
    {
      value: "",
      options: [],
      open: false,
    },
    []
  );

  // useWhyDidYouUpdate("HomeSearch", { ...props, state });

  const s = useCreation(
    () => ({
      canGoto: false,
      focus: false,
    }),
    []
  );

  const onDropDownClick = useMemoizedFn((open) => {
    if (open) {
      state.open = false;
    }
  }, []);

  const goToSearch = (search) => {
    s.canGoto = false;
    // let search = encodeURIComponent(s);
    if (!search) return;
    if (typeof search === "string") {
      const soList = [...customkey, ...SoIcon];
      const url = soList.find((v) => v.key === option.item.activeSo).url;
      if (url) {
        state.value = "";
        if (linkOpenSelf) {
          window.location.href = `${url}${encodeURIComponent(search)}`;
        } else {
          window.open(`${url}${encodeURIComponent(search)}`);
        }
      }
    } else if (search.url) {
      state.value = "";
      if (linkOpenSelf) {
        window.location.href = search.url;
      } else {
        window.open(search.url);
      }
      return;
    }
    state.open = false;

  };

  const goToTranslate = useMemoizedFn((search) => {
    if (!search) return;
    const url = TranslateIcon.find(
      (v) => v.name === option.item.activeTranslate
    ).url;
    if (url) {
      window.open(`${url}${search}`);
      state.open = false;
    }
  }, []);

  const onSelect = useMemoizedFn((data, option) => {
    s.canGoto = true;
    if (option.type) {
      goToSearch({ url: data });
    } else {
      goToSearch(data);
    }
    setTimeout(() => {
      s.canGoto = false;
    }, 200);
  }, []);

  const getPanelValue = useMemoizedFn((searchText) => {
    if (searchText) {
      try {
        Promise.all([
          link.searchLink(searchText),
          api.get(`http://suggestion.baidu.com/su?wd=${searchText}`)
        ]).then(([link, str]) => {
          let startIndex = str.indexOf("s:[") + 2;
          let endIndex = str.indexOf("]})");
          let s = JSON.parse(str.slice(startIndex, endIndex + 1));
          const options = _.orderBy(_.take(s, 8), [], !stickled && isSoBarDown ? 'desc' : 'asc').map(item => ({
            value: item,
          }));
          const _options = [
            {
              label: (<span>搜索提示</span>),
              options,
            }
          ];
          const linkList = (link || []).map((v) => {
            return {
              label: (<SearchLinkItem>
                <FavIconIcon size={14} url={v.url} />
                {v.title}
              </SearchLinkItem>),
              value: v.url,
              type: "link",
            }
          });

          if (linkList.length) {
            _options.unshift({
              label: (<span>本地链接</span>),
              options: _.take(linkList, 5),
            })
          }

          if (linkList.length || options.length) {
            state.options = _options;
            state.open = true;
          } else {
            state.options = [];
            state.open = false;
          }
        })

      } catch (error) {
        console.log("[  ] > error", error);
      }
    } else {
      state.options = [];
    }
  }, [isSoBarDown, stickled]);

  const onChange = useMemoizedFn((e) => {
    state.value = e.target.value;
    if (!e.target.value) {
      state.open = false;
    }
  }, []);

  const onSearchMenuChange = useMemoizedFn((active) => {
    option.setItem("activeSo", active);
  }, []);

  const onTranslateMenuChange = useMemoizedFn((active) => {
    option.setItem("activeTranslate", active);
  }, []);

  useKeyPress(
    "enter",
    () => {
      setTimeout(() => {
        if (!s.canGoto && s.focus) {
          goToSearch(state.value);
        }
      }, 10);
    },
    {
      exactMatch: true,
    }
  );

  useKeyPress(["alt.enter"], () => {
    goToTranslate(state.value);
  });

  React.useEffect(() => {
    if (stickled) {
      state.open = false;
    }
  }, [stickled])


  return (
    <AutoCompleteWrap
      className="head-search"
      variant="borderless"
      value={""}
      options={state.options}
      open={state.open}
      onSelect={onSelect}
      onSearch={getPanelValue}
      onFocus={() => {
        if (state.value) {
          state.open = true;
        }
      }}
      onBlur={() => {
        // state.open = false
      }}
      popupClassName={"search-panel"}
      defaultActiveFirstOption={false}
      backfill={true}
    >
      <SearchWrap
        className={cx({
          hidden: home.isBg2,
          'sn-search-wrap': true,
        })}
        stickled={stickled}
        isRound={option.item?.soStyleIsRound}
      >
        <SearchMenu
          value={option.item.activeSo}
          onChange={onSearchMenuChange}
          onDropDownClick={onDropDownClick}
          isFocus={inputFocus}
        />
        <SearchInput>
          <Input
            ref={inputRef}
            className="search-input"
            placeholder=""
            bordered={false}
            value={state.value}
            onChange={onChange}
            onFocus={() => { setInputFocus(true); s.focus = true }}
            onBlur={() => { setInputFocus(false); s.focus = false }}

          />
        </SearchInput>
        <Divider type="vertical" />
        <TranslateMenu
          value={option.item.activeTranslate}
          onChange={onTranslateMenuChange}
          onDropDownClick={onDropDownClick}
        />
      </SearchWrap>
    </AutoCompleteWrap>
  );
};
export default observer(HomeSearch);
