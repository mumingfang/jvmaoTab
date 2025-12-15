import React from "react";
import { SoIcon } from "../SearchIcon";
import { Tooltip } from 'antd';
import { IconArrowBarDown } from "@tabler/icons-react";
import styled from "styled-components";
import FavIconIcon from "../newtab/scenes/public/FavIconIcon";
import _ from "lodash";
import { getSearchInputValue, watchSearchInput } from "./utils/searchInput";

function changeArray(arr, index) {
    if (index - 2 >= 0) {
        arr[index - 2] = 1.1;
    }
    if (index - 1 >= 0) {
        arr[index - 1] = 1.2;
    }
    arr[index] = 1.3;
    
    if (index + 1 < arr.length) {
        arr[index + 1] = 1.2;
    }
    if (index + 2 < arr.length) {
        arr[index + 2] = 1.1;
    }
    return arr;
}


const Wrap = styled.div`
    position: fixed;
    left: 20px;
    bottom: 50px;
    z-index: 99999;
`;

const Nav = styled.ul`
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    height: ${(props) => props.close ? 0 : 'auto'};
    transition: height 0.3s;
`;
const NavItem = styled.li`
    margin-top: 8px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    overflow: hidden;
    transition: all 0.3s;
    svg,img {
        width: 100% !important;
        height: 100% !important;
    }
`;

const CloseIcon = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--fff);
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    border: 1px solid #eee;
    cursor: pointer;
    svg {
        transform: ${(props) => props.close ? 'rotate(180deg)' : 'rotate(0deg)'};
        transition: transform 0.3s;
    }
`;

const So = () => {
    const ref = React.useRef();
    const timeoutRef = React.useRef(null);
    const watchCleanupRef = React.useRef(null);
    const [loading, setLoading] = React.useState(true);
    const [soList, setSoList] = React.useState([]);
    const [n, setN] = React.useState([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchParams, setSearchParams] = React.useState({});
    const [close, setClose] = React.useState(false);
    const [currentSearchText, setCurrentSearchText] = React.useState(""); // 当前搜索框中的文本
    const [inputSelectors, setInputSelectors] = React.useState({}); // 每个 hostname 对应的搜索框选择器

    // 使用 state 确保 href 在 URL 变化时更新
    const [href, setHref] = React.useState(() => {
        try {
            return new URL(window.location.href);
        } catch (e) {
            console.error("Failed to parse URL:", e);
            return null;
        }
    });

    // 监听 URL 变化（适用于 SPA 或页面导航）
    React.useEffect(() => {
        const updateHref = () => {
            try {
                setHref(new URL(window.location.href));
            } catch (e) {
                console.error("Failed to parse URL:", e);
                setHref(null);
            }
        };

        // 监听 popstate 事件（浏览器前进/后退）
        window.addEventListener('popstate', updateHref);
        
        // 对于 SPA，可能需要监听其他事件，这里使用 MutationObserver 作为备选
        // 但更推荐在路由变化时手动触发更新
        
        return () => {
            window.removeEventListener('popstate', updateHref);
        };
    }, []);

    const get_text = React.useCallback(() => {
        if (!href) {
            return "";
        }

        // 优先从搜索框获取（实时更新）
        // 搜索框的值是原始文本，需要编码
        if (currentSearchText) {
            return encodeURIComponent(currentSearchText);
        }

        // 回退到从 URL 参数获取
        // URLSearchParams.get() 返回的是解码后的值，也需要编码
        if (searchParams[href.hostname]) {
            const paramValue = href.searchParams.get(searchParams[href.hostname]);
            if (paramValue) {
                return encodeURIComponent(paramValue);
            }
        }

        return "";
    }, [searchParams, href, currentSearchText]);

    const onMouseEnter = React.useCallback((key) => {
        if (!Array.isArray(n) || n.length === 0) {
            return;
        }
        const newArr = new Array(n.length).fill(1);
        changeArray(newArr, key);
        setN(newArr);
    }, [n]);

    const onMouseLeave = React.useCallback(() => {
        if (!Array.isArray(n) || n.length === 0) {
            return;
        }
        // 清除之前的 timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setN(new Array(n.length).fill(1));
            timeoutRef.current = null;
        }, 50);
    }, [n]);

    // 清理 timeout 当组件卸载时
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // 监听搜索框变化
    React.useEffect(() => {
        if (!href || loading) {
            return;
        }

        const currentDomain = href.hostname;
        const customSelector = inputSelectors[currentDomain] || null;

        // 初始化搜索框文本
        const initialValue = getSearchInputValue(currentDomain, customSelector);
        if (initialValue) {
            setCurrentSearchText(initialValue);
        }

        // 开始监听搜索框变化
        const cleanup = watchSearchInput(currentDomain, (value) => {
            setCurrentSearchText(value);
        }, customSelector);

        watchCleanupRef.current = cleanup;

        return () => {
            if (watchCleanupRef.current) {
                watchCleanupRef.current();
                watchCleanupRef.current = null;
            }
        };
    }, [href, loading, inputSelectors]);



    React.useEffect(() => {
        if (!href) {
            setLoading(false);
            return;
        }

        try {
            chrome.runtime.sendMessage({
                type: "getOption",
            }, (res) => {
                // 检查 chrome.runtime.lastError
                if (chrome.runtime.lastError) {
                    console.error("Chrome runtime error:", chrome.runtime.lastError);
                    setLoading(false);
                    return;
                }

                if (res && typeof res['soList'] !== 'undefined' && res['soList'].length > 0) {
                    const _n = [];
                    const hosts = [];
                    const selectors = {}; // 存储每个 hostname 对应的搜索框选择器
                    const soList = res['customkey']?.length ? [...SoIcon, ...res['customkey']] : SoIcon;
                    const activeSoList = res['soList'].map((v, k) => {
                        _n[k] = 1;
                        return _.find(soList, function (o) { return o.key === v; })
                    }).filter(Boolean); // 过滤掉 undefined 值

                    activeSoList.forEach((v) => {
                        if (v && v.host && Array.isArray(v.host)) {
                            v.host.forEach((host) => {
                                if (host && v.searchParams) {
                                    hosts[host] = v.searchParams;
                                    // 如果搜索引擎配置了 inputSelector，保存它
                                    if (v.inputSelector) {
                                        selectors[host] = v.inputSelector;
                                    }
                                }
                            });
                        }
                    });

                    const currentDomain = href.hostname;
                    const params = new URLSearchParams(window.location.search);
                    if (currentDomain && hosts[currentDomain] && params.has(hosts[currentDomain])) {
                        setLoading(false);
                        setSoList(activeSoList);
                        setSearchParams(hosts);
                        setInputSelectors(selectors);
                        setN(_n);
                        
                        // 初始化搜索框文本（从 URL 参数）
                        const initialText = params.get(hosts[currentDomain]) || "";
                        setCurrentSearchText(initialText);
                        
                        if (res['soAOpen']) {
                            setIsOpen(true);
                        }
                    } else {
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            });
        } catch (error) {
            console.error("Error sending message to chrome runtime:", error);
            setLoading(false);
        }
    }, [href])

    if (loading || !soList || soList.length === 0) {
        return null;
    }

    return (
        <Wrap>
            <Tooltip placement="right" title="橘猫起始页" >
                <CloseIcon onClick={() => setClose(!close)} close={close}>
                    <IconArrowBarDown
                        size={14}
                    />
                </CloseIcon>
            </Tooltip>

            <Nav
                close={close}
                ref={ref}
                onMouseLeave={() => {
                    onMouseLeave();
                }}
            >
                {soList.map((item, k) => {
                    if (!item || !href) {
                        return null;
                    }
                    // 统一使用 hostname 进行比较
                    const itemHosts = item.host || [];
                    const currentHostname = href.hostname;
                    // 如果是特殊类型搜索引擎，不显示在快捷搜索切换工具中
                    const shouldShow = !itemHosts.includes(currentHostname) && !item.isSpecialType;
                    
                    return shouldShow ? (
                        <NavItem
                            key={item.name || `item-${k}`}
                            onMouseEnter={() => {
                                onMouseEnter(k);
                            }}
                            onClick={() => {
                                try {
                                    const text = get_text();
                                    const targetUrl = item.url + text;
                                    window.open(targetUrl, isOpen ? "_blank" : "_self");
                                } catch (error) {
                                    console.error("Error opening URL:", error);
                                }
                            }}
                            // style={{ "--jvmao-net-scale": (Array.isArray(n) && n[k] !== undefined) ? n[k] : 1 }}
                        >
                            <Tooltip placement="right" title={item.name} >
                                {item.icon ? item.icon : <div><FavIconIcon size={80} url={item.url} onlyDomain /></div>}
                            </Tooltip>
                        </NavItem>
                    ) : null;
                })}
            </Nav>
        </Wrap>
    );
};

export default So;