import React from "react";
import { SoIcon } from "../SearchIcon";

// 全局标志，防止重复执行
let isProcessing = false;
let processedQuery = null;

/**
 * 通用特殊搜索引擎处理组件
 * 用于处理不支持URL参数直接搜索的AI助手（如豆包）
 * 通过 chrome.storage 获取查询内容并自动填入输入框
 */
const SpecialSearch = () => {
    React.useEffect(() => {
        // 获取当前 hostname
        const url = new URL(window.location.href);
        const hostname = url.hostname;
        
        // 优先从 chrome.storage.local 获取查询内容（最可靠的方式）
        const storageKey = `jvmaoQuery_${hostname}`;
        
        // 从 chrome.storage 读取
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([storageKey], (result) => {
                if (chrome.runtime.lastError) {
                    handleFallback();
                    return;
                }
                
                const queryData = result[storageKey];
                
                if (queryData && queryData.query) {
                    // 检查是否在 30 秒内（防止过期数据）
                    const timeDiff = Date.now() - (queryData.timestamp || 0);
                    
                    if (timeDiff < 30000) { // 30 秒内有效
                        // 读取成功后，清除存储的数据（避免重复处理）
                        chrome.storage.local.remove([storageKey]);
                        
                        // 继续处理搜索
                        processSearch(queryData.query, url, hostname);
                    } else {
                        // 过期数据，清除
                        chrome.storage.local.remove([storageKey]);
                        handleFallback();
                    }
                } else {
                    handleFallback();
                }
            });
        } else {
            handleFallback();
        }
        
        // 降级方案：从 sessionStorage 或 URL 参数读取（兼容旧版本）
        function handleFallback() {
            // 尝试从 sessionStorage 读取
            try {
                const storedQuery = sessionStorage.getItem('jvmaoQuery');
                const storedTime = sessionStorage.getItem('jvmaoQueryTime');
                
                if (storedQuery && storedTime) {
                    const timeDiff = Date.now() - parseInt(storedTime, 10);
                    if (timeDiff < 30000) {
                        processSearch(storedQuery, url, hostname);
                        return;
                    } else {
                        sessionStorage.removeItem('jvmaoQuery');
                        sessionStorage.removeItem('jvmaoQueryTime');
                    }
                }
            } catch (e) {
                // 忽略错误
            }
            
            // 最后尝试从 URL 参数读取（兼容性）
            const urlQueryParam = url.searchParams.get("jvmaoQuery");
            if (urlQueryParam) {
                processSearch(urlQueryParam, url, hostname);
                return;
            }
            
            isProcessing = false;
            processedQuery = null;
        }
        
        // 处理搜索的核心函数
        function processSearch(query, currentUrl, currentHostname) {
            if (!query) {
                isProcessing = false;
                processedQuery = null;
                return;
            }

            // 如果正在处理相同的query，直接返回
            if (isProcessing && processedQuery === query) {
                return;
            }

            // 标记为正在处理
            isProcessing = true;
            processedQuery = query;
            
            // 从配置中查找匹配的搜索引擎配置
            chrome.runtime.sendMessage({
                type: "getOption",
            }, (res) => {
                if (chrome.runtime.lastError) {
                    isProcessing = false;
                    return;
                }

                // 合并内置配置和自定义配置
                const customkey = res?.customkey || [];
                const allSearchEngines = [...SoIcon, ...customkey];
                
                // 查找匹配的搜索引擎配置
                const searchConfig = allSearchEngines.find((engine) => {
                    if (!engine.isSpecialType) return false;
                    if (!engine.host || !Array.isArray(engine.host)) return false;
                    return engine.host.includes(currentHostname);
                });

                if (!searchConfig) {
                    isProcessing = false;
                    return;
                }

                // 开始处理特殊搜索
                handleSpecialSearch(searchConfig, query, currentUrl);
            });
        }
    }, []);

    return null;
};

/**
 * 处理特殊搜索的核心函数
 * @param {Object} config - 搜索引擎配置
 * @param {string} query - 搜索关键词
 * @param {URL} url - 当前URL对象
 */
function handleSpecialSearch(config, query, url) {
    const {
        inputSelector = "textarea, input[type='text']",
        key, // 搜索引擎的 key，用于特殊处理
    } = config;

    const maxRetries = 10;
    const retryDelay = 500;
    const maxWaitTime = 10000;
    const startTime = Date.now();

    // 解析选择器（支持多个，逗号分隔）
    const selectors = inputSelector.split(',').map(s => s.trim());

    /**
     * 检查页面是否加载完成
     * @returns {boolean}
     */
    function isPageReady() {
        if (document.readyState === 'complete') {
            if (!document.body) {
                return false;
            }
            if (document.body.children.length === 0) {
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * 等待页面加载完成
     * @returns {Promise<void>}
     */
    function waitForPageReady() {
        return new Promise((resolve) => {
            // 如果已经加载完成，直接返回
            if (isPageReady()) {
                setTimeout(resolve, 300);
                return;
            }

            let resolved = false;
            const timeoutIds = [];
            let observer = null;

            const cleanup = () => {
                timeoutIds.forEach(id => clearTimeout(id));
                timeoutIds.length = 0;
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            };

            const addTimeout = (callback, delay) => {
                const id = setTimeout(callback, delay);
                timeoutIds.push(id);
                return id;
            };

            const doResolve = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                setTimeout(resolve, 300);
            };

            const currentState = document.readyState;

            // 如果页面正在加载
            if (currentState === 'loading') {
                const onDOMContentLoaded = () => {
                    if (document.readyState === 'complete') {
                        if (isPageReady()) {
                            doResolve();
                        } else {
                            waitForPageContent(doResolve);
                        }
                    } else {
                        window.addEventListener('load', () => {
                            if (isPageReady()) {
                                doResolve();
                            } else {
                                waitForPageContent(doResolve);
                            }
                        }, { once: true });
                        addTimeout(doResolve, 5000);
                    }
                };

                document.addEventListener('DOMContentLoaded', onDOMContentLoaded, { once: true });
                addTimeout(doResolve, 8000);
            } 
            // 如果已经在 interactive 状态
            else if (currentState === 'interactive') {
                if (document.readyState === 'complete') {
                    if (isPageReady()) {
                        doResolve();
                    } else {
                        waitForPageContent(doResolve);
                    }
                } else {
                    window.addEventListener('load', () => {
                        if (isPageReady()) {
                            doResolve();
                        } else {
                            waitForPageContent(doResolve);
                        }
                    }, { once: true });
                    addTimeout(doResolve, 3000);
                }
            } 
            // 如果已经是 complete 状态
            else if (currentState === 'complete') {
                waitForPageContent(doResolve);
            } 
            // 未知状态
            else {
                addTimeout(doResolve, 500);
            }

            // 辅助函数：等待页面内容加载（适用于SPA场景）
            function waitForPageContent(callback) {
                let attempts = 0;
                const maxAttempts = 20;
                let checkTimeoutId = null;
                
                const checkReady = () => {
                    attempts++;
                    if (isPageReady()) {
                        if (checkTimeoutId) clearTimeout(checkTimeoutId);
                        callback();
                        return;
                    }
                    if (attempts < maxAttempts) {
                        checkTimeoutId = setTimeout(checkReady, 300);
                        timeoutIds.push(checkTimeoutId);
                    } else {
                        if (checkTimeoutId) clearTimeout(checkTimeoutId);
                        callback();
                    }
                };

                // 使用 MutationObserver 监听DOM变化
                if (document.body) {
                    const mutObserver = new MutationObserver(() => {
                        if (isPageReady()) {
                            if (checkTimeoutId) clearTimeout(checkTimeoutId);
                            mutObserver.disconnect();
                            callback();
                        }
                    });
                    mutObserver.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                    observer = mutObserver;
                }

                // 同时使用轮询作为兜底
                checkTimeoutId = setTimeout(checkReady, 300);
                timeoutIds.push(checkTimeoutId);
                const finalTimeoutId = setTimeout(callback, 6000);
                timeoutIds.push(finalTimeoutId);
            }
        });
    }

    /**
     * 查找输入框
     * @returns {HTMLElement|null}
     */
    function findInputElement() {
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    // 检查是否是标准输入框
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        if (element.offsetParent !== null && !element.disabled && !element.readOnly) {
                            return element;
                        }
                    }
                    // 检查是否是 contenteditable 元素
                    else if (element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
                        if (element.offsetParent !== null) {
                            return element;
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
        return null;
    }

    /**
     * 尝试填入query并触发回车
     * @param {number} retryCount - 当前重试次数
     */
    async function tryFillAndSubmit(retryCount = 0) {
        // 检查是否超时
        if (Date.now() - startTime > maxWaitTime) {
            isProcessing = false;
            processedQuery = null;
            return;
        }

        // 等待页面加载完成（仅在第一次或页面未就绪时）
        if (retryCount === 0 || !isPageReady()) {
            await waitForPageReady();
        }

        const inputElement = findInputElement();

        if (!inputElement) {
            // 如果没找到，且还有重试次数，则重试
            if (retryCount < maxRetries) {
                setTimeout(async () => {
                    await tryFillAndSubmit(retryCount + 1);
                }, retryDelay);
            } else {
                isProcessing = false;
                processedQuery = null;
            }
            return;
        }

        try {
            // 判断是否是 contenteditable 元素
            const isContentEditable = inputElement.contentEditable === 'true' || 
                                     inputElement.getAttribute('contenteditable') === 'true' ||
                                     inputElement.getAttribute('role') === 'textbox';
            
            // 填入query值
            if (isContentEditable) {
                // 先清空现有内容
                while (inputElement.firstChild) {
                    inputElement.removeChild(inputElement.firstChild);
                }
                inputElement.textContent = '';
                inputElement.innerText = '';
                
                // 触发 beforeinput 事件
                const beforeInputEvent = new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: query
                });
                inputElement.dispatchEvent(beforeInputEvent);
                
                // 设置内容
                inputElement.textContent = query;
                
                // 触发 input 事件
                const inputEvent = new InputEvent('input', { 
                    bubbles: true, 
                    cancelable: true,
                    inputType: 'insertText',
                    data: query
                });
                inputElement.dispatchEvent(inputEvent);
                
                // 兜底检查：如果内容重复，修正为单次内容
                setTimeout(() => {
                    const currentText = inputElement.textContent || inputElement.innerText || '';
                    if (currentText === query + query) {
                        while (inputElement.firstChild) {
                            inputElement.removeChild(inputElement.firstChild);
                        }
                        inputElement.textContent = query;
                        const fixInputEvent = new InputEvent('input', { 
                            bubbles: true, 
                            cancelable: true,
                            inputType: 'insertText',
                            data: query
                        });
                        inputElement.dispatchEvent(fixInputEvent);
                    }
                }, 150);
            } else {
                // 对于标准输入框
                inputElement.value = '';
                inputElement.value = query;
                
                // 触发input事件
                const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                inputElement.dispatchEvent(inputEvent);
                
                // 触发change事件
                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                inputElement.dispatchEvent(changeEvent);
                
                // 兜底检查：如果内容重复，修正为单次内容
                setTimeout(() => {
                    const currentValue = inputElement.value || '';
                    if (currentValue === query + query) {
                        inputElement.value = query;
                        const fixInputEvent = new Event('input', { bubbles: true, cancelable: true });
                        inputElement.dispatchEvent(fixInputEvent);
                        const fixChangeEvent = new Event('change', { bubbles: true, cancelable: true });
                        inputElement.dispatchEvent(fixChangeEvent);
                    }
                }, 150);
            }
            
            inputElement.focus();

            // 延迟一小段时间后触发回车
            setTimeout(() => {
                // 触发回车事件
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                });
                inputElement.dispatchEvent(enterEvent);

                const enterEvent2 = new KeyboardEvent('keyup', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                });
                inputElement.dispatchEvent(enterEvent2);

                const enterEvent3 = new KeyboardEvent('keypress', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                });
                inputElement.dispatchEvent(enterEvent3);

                // 如果输入框在form中，尝试提交form
                if (inputElement.form) {
                    try {
                        inputElement.form.requestSubmit();
                    } catch (e) {
                        try {
                            inputElement.form.submit();
                        } catch (e2) {
                            // 忽略错误
                        }
                    }
                }

                // 重置处理标志
                isProcessing = false;
                processedQuery = null;
            }, 100);
        } catch (error) {
            isProcessing = false;
            processedQuery = null;
        }
    }

    // 等待页面加载完成后开始尝试
    waitForPageReady().then(() => {
        tryFillAndSubmit();
    }).catch(() => {
        isProcessing = false;
        processedQuery = null;
    });
}

export default SpecialSearch;
