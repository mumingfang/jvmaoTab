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
  useDebounceFn,
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
  // 使用 useState 管理 value，确保更新能触发重新渲染
  const [inputValue, setInputValue] = React.useState("");

  const state = useReactive(
    {
      options: [],
      open: false,
      selectedIndex: -1, // 当前选中的选项索引
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

  // 用于取消之前的请求，避免竞态条件
  const requestControllerRef = React.useRef(null);
  
  // 缓存 soList，避免每次重新创建
  const soList = useCreation(() => {
    return [...customkey, ...SoIcon];
  }, [customkey]);

  const onDropDownClick = useMemoizedFn((open) => {
    if (open) {
      state.open = false;
    }
  }, []);

  // 扁平化所有选项，用于键盘导航
  // 注意：不使用 useMemo，因为 state.options 是 useReactive 对象，useMemo 可能无法正确检测变化
  const getFlatOptions = useMemoizedFn(() => {
    const result = [];
    state.options.forEach((group) => {
      if (group.options && Array.isArray(group.options)) {
        group.options.forEach((option) => {
          result.push(option);
        });
      }
    });
    return result;
  }, []);

  const goToSearch = useMemoizedFn((search) => {
    s.canGoto = false;
    if (!search) return;
    if (typeof search === "string") {
      const activeSoItem = soList.find((v) => v.key === option.item.activeSo);
      if (activeSoItem?.url) {
        setInputValue("");
        const searchUrl = `${activeSoItem.url}${encodeURIComponent(search)}`;
        if (linkOpenSelf) {
          window.location.href = searchUrl;
        } else {
          window.open(searchUrl);
        }
      }
    } else if (search.url) {
      setInputValue("");
      if (linkOpenSelf) {
        window.location.href = search.url;
      } else {
        window.open(search.url);
      }
      return;
    }
    state.open = false;
  }, [soList, option.item.activeSo, linkOpenSelf]);

  const goToTranslate = useMemoizedFn((search) => {
    if (!search) return;
    const translateItem = TranslateIcon.find(
      (v) => v.name === option.item.activeTranslate
    );
    if (translateItem?.url) {
      window.open(`${translateItem.url}${search}`);
      state.open = false;
    }
  }, [option.item.activeTranslate]);

  const onSelect = useMemoizedFn((data, option) => {
    s.canGoto = true;
    state.selectedIndex = -1; // 重置选中索引
    if (option.type) {
      goToSearch({ url: data });
    } else {
      goToSearch(data);
    }
    setTimeout(() => {
      s.canGoto = false;
    }, 200);
  }, [goToSearch]);

  // 缓存 JSX 标签元素，避免每次重新创建
  const searchHintLabel = useCreation(() => <span>搜索提示</span>, []);
  const localLinkLabel = useCreation(() => <span>本地链接</span>, []);

  // 获取搜索建议的核心逻辑
  const fetchSearchSuggestions = useMemoizedFn((searchText) => {
    // 取消之前的请求
    if (requestControllerRef.current) {
      // 注意：这里假设 api.get 支持 AbortController，如果不支持需要适配
      // 为了兼容性，我们使用一个标志来标记请求是否已过期
      requestControllerRef.current.cancelled = true;
    }

    const currentRequest = { cancelled: false };
    requestControllerRef.current = currentRequest;

    Promise.all([
      link.searchLink(searchText),
      api.get(`http://suggestion.baidu.com/su?wd=${searchText}`)
    ]).then(([linkResults, str]) => {
      // 检查请求是否已被取消
      if (currentRequest.cancelled) {
        return;
      }

      try {
        let startIndex = str.indexOf("s:[") + 2;
        let endIndex = str.indexOf("]})");
        if (startIndex < 2 || endIndex < 0) {
          throw new Error("Invalid response format");
        }
        let suggestions = JSON.parse(str.slice(startIndex, endIndex + 1));
        
        const options = _.orderBy(
          _.take(suggestions, 8), 
          [], 
          !stickled && isSoBarDown ? 'desc' : 'asc'
        ).map(item => ({
          value: item,
        }));

        const _options = [
          {
            label: searchHintLabel,
            options,
          }
        ];

        const linkList = (linkResults || []).map((v) => {
          return {
            label: (
              <SearchLinkItem>
                <FavIconIcon size={14} url={v.url} />
                {v.title}
              </SearchLinkItem>
            ),
            value: v.url,
            type: "link",
          };
        });

        if (linkList.length) {
          _options.unshift({
            label: localLinkLabel,
            options: _.take(linkList, 5),
          });
        }

        if (linkList.length || options.length) {
          state.options = _options;
          state.open = true;
          state.selectedIndex = -1; // 重置选中索引
        } else {
          state.options = [];
          state.open = false;
          state.selectedIndex = -1; // 重置选中索引
        }
      } catch (error) {
        console.error("[HomeSearch] Error parsing search suggestions:", error);
        // 即使解析失败，也尝试显示本地链接
        const linkList = (linkResults || []).map((v) => {
          return {
            label: (
              <SearchLinkItem>
                <FavIconIcon size={14} url={v.url} />
                {v.title}
              </SearchLinkItem>
            ),
            value: v.url,
            type: "link",
          };
        });

        if (linkList.length) {
          state.options = [{
            label: localLinkLabel,
            options: _.take(linkList, 5),
          }];
          state.open = true;
          state.selectedIndex = -1;
        } else {
          state.options = [];
          state.open = false;
          state.selectedIndex = -1;
        }
      }
    }).catch((error) => {
      // 请求失败时，只显示本地链接
      if (currentRequest.cancelled) {
        return;
      }
      console.error("[HomeSearch] Error fetching search suggestions:", error);
      link.searchLink(searchText).then((linkResults) => {
        if (currentRequest.cancelled) {
          return;
        }
        const linkList = (linkResults || []).map((v) => {
          return {
            label: (
              <SearchLinkItem>
                <FavIconIcon size={14} url={v.url} />
                {v.title}
              </SearchLinkItem>
            ),
            value: v.url,
            type: "link",
          };
        });

        if (linkList.length) {
          state.options = [{
            label: localLinkLabel,
            options: _.take(linkList, 5),
          }];
          state.open = true;
          state.selectedIndex = -1;
        } else {
          state.options = [];
          state.open = false;
          state.selectedIndex = -1;
        }
      });
    });
  }, [isSoBarDown, stickled, link, searchHintLabel, localLinkLabel]);

  // 使用防抖处理搜索请求
  const { run: getPanelValue } = useDebounceFn(
    (searchText) => {
      if (searchText) {
        fetchSearchSuggestions(searchText);
      } else {
        state.options = [];
        state.open = false;
        state.selectedIndex = -1;
      }
    },
    { wait: 100 }
  );

  const onChange = useMemoizedFn((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    state.selectedIndex = -1; // 重置选中索引
    if (!newValue) {
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
          // 如果有选中的选项，使用选中的选项
          if (state.selectedIndex >= 0 && state.open) {
            const flatOptions = getFlatOptions();
            if (flatOptions.length > 0) {
              const selectedOption = flatOptions[state.selectedIndex];
              if (selectedOption) {
                if (selectedOption.type === 'link') {
                  goToSearch({ url: selectedOption.value });
                } else {
                  goToSearch(selectedOption.value);
                }
                return;
              }
            }
          }
          // 否则使用输入框的值
          goToSearch(inputValue);
        }
      }, 10);
    },
    {
      exactMatch: true,
    }
  );

  useKeyPress(["alt.enter"], () => {
    goToTranslate(inputValue);
  });

  useKeyPress(
    "tab",
    (e) => {
      if (!inputFocus) {
        inputRef.current.focus();
      }
    },
    {
      exactMatch: true,
    }
  );

  // 回填值到输入框的辅助函数
  const updateInputValue = useMemoizedFn((value) => {
    // 更新 React state
    setInputValue(value);
    
    // 直接操作 DOM 元素确保立即显示
    // 使用 setTimeout 确保在下一个事件循环中执行，避免与 React 的更新冲突
    setTimeout(() => {
      if (inputRef.current) {
        // Ant Design Input 组件，ref 指向的是 Input 组件实例
        // 需要获取内部的 input 元素
        const inputElement = inputRef.current.input || inputRef.current;
        if (inputElement) {
          // 直接设置 DOM 值
          inputElement.value = value;
          
          // 触发 input 事件，让 React 和 Ant Design 知道值已改变
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          inputElement.dispatchEvent(inputEvent);
          
          // 也触发 change 事件
          const changeEvent = new Event('change', { bubbles: true, cancelable: true });
          inputElement.dispatchEvent(changeEvent);
        }
      }
    }, 0);
  }, []);

  // 上下键切换下拉选项并回填到输入框
  useKeyPress(
    "uparrow",
    (e) => {
      if (inputFocus && state.open && state.options.length > 0) {
        e.preventDefault();
        const flatOptions = getFlatOptions();
        if (flatOptions.length > 0) {
          // 如果当前没有选中，则选中最后一个
          if (state.selectedIndex < 0) {
            state.selectedIndex = flatOptions.length - 1;
          } else {
            // 向上移动，循环到最后一个
            state.selectedIndex = (state.selectedIndex - 1 + flatOptions.length) % flatOptions.length;
          }
          // 回填到输入框
          const selectedOption = flatOptions[state.selectedIndex];
          if (selectedOption && selectedOption.value) {
            // 只有搜索提示（非链接类型）需要回填
            if (selectedOption.type !== 'link') {
              updateInputValue(selectedOption.value);
            }
          }
        }
      }
    },
    {
      exactMatch: true,
    }
  );

  useKeyPress(
    "downarrow",
    (e) => {
      if (inputFocus && state.open && state.options.length > 0) {
        e.preventDefault();
        const flatOptions = getFlatOptions();
        if (flatOptions.length > 0) {
          // 如果当前没有选中，则选中第一个
          if (state.selectedIndex < 0) {
            state.selectedIndex = 0;
          } else {
            // 向下移动，循环到第一个
            state.selectedIndex = (state.selectedIndex + 1) % flatOptions.length;
          }
          // 回填到输入框
          const selectedOption = flatOptions[state.selectedIndex];
          if (selectedOption && selectedOption.value) {
            // 只有搜索提示（非链接类型）需要回填
            if (selectedOption.type !== 'link') {
              updateInputValue(selectedOption.value);
            }
          }
        }
      }
    },
    {
      exactMatch: true,
    }
  );

  React.useEffect(() => {
    if (stickled) {
      state.open = false;
      state.selectedIndex = -1;
    }
  }, [stickled]);

  // 组件卸载时清理请求
  React.useEffect(() => {
    return () => {
      if (requestControllerRef.current) {
        requestControllerRef.current.cancelled = true;
      }
    };
  }, []);


  return (
    <AutoCompleteWrap
      className="head-search"
      variant="borderless"
      value={inputValue}
      options={state.options}
      open={state.open}
      onSelect={onSelect}
      onSearch={getPanelValue}
      onChange={(value) => {
        // AutoComplete 的 onChange 事件，确保值同步
        if (value !== inputValue) {
          setInputValue(value);
        }
      }}
      onFocus={() => {
        if (inputValue) {
          state.open = true;
        }
      }}
      onBlur={() => {
        // state.open = false
        state.selectedIndex = -1; // 重置选中索引
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
            value={inputValue}
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
