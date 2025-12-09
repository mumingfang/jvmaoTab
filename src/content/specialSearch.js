import React from "react";
import { SoIcon } from "../SearchIcon";

// 全局标志，防止重复执行
let isProcessing = false;
let processedQuery = null;

/**
 * 通用特殊搜索引擎处理组件
 * 用于处理不支持URL参数直接搜索的AI助手（如豆包）
 * 通过检测URL中的jvmaoQuery参数，延迟后自动填入输入框并触发回车
 */
const SpecialSearch = () => {
    React.useEffect(() => {
        // 优先从 sessionStorage 获取查询内容（更可靠，不会被清除）
        let queryParam = null;
        try {
            const storedQuery = sessionStorage.getItem('jvmaoQuery');
            const storedTime = sessionStorage.getItem('jvmaoQueryTime');
            // 检查是否在 30 秒内（防止过期数据）
            if (storedQuery && storedTime) {
                const timeDiff = Date.now() - parseInt(storedTime, 10);
                if (timeDiff < 30000) { // 30 秒内有效
                    queryParam = storedQuery;
                } else {
                    // 过期数据，清除
                    sessionStorage.removeItem('jvmaoQuery');
                    sessionStorage.removeItem('jvmaoQueryTime');
                }
            }
        } catch (e) {
            console.warn('[SpecialSearch] Failed to read sessionStorage:', e);
        }
        
        // 如果 sessionStorage 没有，回退到 URL 参数
        if (!queryParam) {
            const url = new URL(window.location.href);
            queryParam = url.searchParams.get("jvmaoQuery");
        }
        
        // 如果没有查询内容，不需要处理
        if (!queryParam) {
            isProcessing = false;
            processedQuery = null;
            return;
        }

        // 如果正在处理相同的query，直接返回
        if (isProcessing && processedQuery === queryParam) {
            return;
        }

        // 标记为正在处理
        isProcessing = true;
        processedQuery = queryParam;
        
        // 获取当前hostname
        const url = new URL(window.location.href);
        const hostname = url.hostname;
        
        // 从配置中查找匹配的搜索引擎配置
        // 需要从chrome storage获取自定义配置
        chrome.runtime.sendMessage({
            type: "getOption",
        }, (res) => {
            if (chrome.runtime.lastError) {
                console.error("Chrome runtime error:", chrome.runtime.lastError);
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
                return engine.host.includes(hostname);
            });

            if (!searchConfig) {
                console.warn(`[SpecialSearch] No config found for hostname: ${hostname}`);
                isProcessing = false;
                return;
            }

            // 开始处理特殊搜索
            handleSpecialSearch(searchConfig, queryParam, url);
        });
    }, []);

    return null;
};

/**
 * 清理存储的查询内容
 */
function cleanupStoredQuery() {
    try {
        sessionStorage.removeItem('jvmaoQuery');
        sessionStorage.removeItem('jvmaoQueryTime');
    } catch (e) {
        console.warn('[SpecialSearch] Failed to clear sessionStorage:', e);
    }
}

/**
 * 处理特殊搜索的核心函数
 * @param {Object} config - 搜索引擎配置
 * @param {string} query - 搜索关键词
 * @param {URL} url - 当前URL对象
 */
function handleSpecialSearch(config, query, url) {
    const {
        inputSelector = "textarea, input[type='text']",
        delay = 500,
        key, // 搜索引擎的 key，用于特殊处理
    } = config;

    const maxRetries = 3;
    const retryDelay = 1000; // 每次重试延迟1秒
    const maxWaitTime = 5000; // 最多等待5秒
    const startTime = Date.now();

    // 解析选择器（支持多个，逗号分隔）
    const selectors = inputSelector.split(',').map(s => s.trim());

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
                        // 检查元素是否可见和可编辑
                        if (element.offsetParent !== null && !element.disabled && !element.readOnly) {
                            return element;
                        }
                    }
                    // 检查是否是 contenteditable 元素
                    else if (element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
                        // 检查元素是否可见
                        if (element.offsetParent !== null) {
                            return element;
                        }
                    }
                }
            } catch (e) {
                // 选择器无效，继续尝试下一个
                continue;
            }
        }
        return null;
    }

    /**
     * 尝试填入query并触发回车
     * @param {number} retryCount - 当前重试次数
     */
    function tryFillAndSubmit(retryCount = 0) {
        // 检查是否超时
        if (Date.now() - startTime > maxWaitTime) {
            console.warn("[SpecialSearch] Timeout waiting for input element");
            cleanupUrl(url);
            cleanupStoredQuery();
            // 重置处理标志
            isProcessing = false;
            processedQuery = null;
            return;
        }

        const inputElement = findInputElement();

        if (!inputElement) {
            // 如果没找到，且还有重试次数，则重试
            if (retryCount < maxRetries) {
                setTimeout(() => {
                    tryFillAndSubmit(retryCount + 1);
                }, retryDelay);
            } else {
                console.warn("[SpecialSearch] Input element not found after retries");
                cleanupUrl(url);
                cleanupStoredQuery();
                // 重置处理标志
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
                // 先清空现有内容（对于某些编辑器，需要更彻底地清空）
                // 删除所有子节点，确保完全清空
                while (inputElement.firstChild) {
                    inputElement.removeChild(inputElement.firstChild);
                }
                inputElement.textContent = '';
                inputElement.innerText = '';
                
                // 对于 contenteditable 元素，先触发 beforeinput 事件（某些编辑器需要）
                const beforeInputEvent = new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: query
                });
                inputElement.dispatchEvent(beforeInputEvent);
                
                // 然后设置内容
                inputElement.textContent = query;
                
                // 最后触发 input 事件（contenteditable 元素通常监听这个）
                const inputEvent = new InputEvent('input', { 
                    bubbles: true, 
                    cancelable: true,
                    inputType: 'insertText',
                    data: query
                });
                inputElement.dispatchEvent(inputEvent);
                
                // 兜底检查：如果内容重复（比如 "你好你好"），修正为单次内容
                setTimeout(() => {
                    const currentText = inputElement.textContent || inputElement.innerText || '';
                    // 检查是否完全重复（query + query）
                    if (currentText === query + query) {
                        // 清空并重新设置
                        while (inputElement.firstChild) {
                            inputElement.removeChild(inputElement.firstChild);
                        }
                        inputElement.textContent = query;
                        // 触发 input 事件
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
                // 对于标准输入框，先清空再设置
                inputElement.value = '';
                inputElement.value = query;
                
                // 触发input事件，确保页面知道值已改变
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
                // 尝试触发回车事件
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

                // 也尝试触发keypress
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
                        // 如果requestSubmit不支持，尝试submit
                        try {
                            inputElement.form.submit();
                        } catch (e2) {
                            // 忽略错误
                        }
                    }
                }

                // 清理URL参数和 sessionStorage
                cleanupUrl(url);
                cleanupStoredQuery();
                // 重置处理标志
                isProcessing = false;
                processedQuery = null;
            }, 100);
        } catch (error) {
            console.error("[SpecialSearch] Error filling input:", error);
            cleanupUrl(url);
            cleanupStoredQuery();
            // 重置处理标志
            isProcessing = false;
            processedQuery = null;
        }
    }

    // 延迟指定时间后开始尝试
    setTimeout(() => {
        tryFillAndSubmit();
    }, delay);
}

/**
 * 清理URL中的jvmaoQuery参数
 * @param {URL} url - URL对象
 */
function cleanupUrl(url) {
    try {
        url.searchParams.delete("jvmaoQuery");
        const newUrl = url.toString();
        // 使用replaceState清除参数，不刷新页面
        window.history.replaceState({}, '', newUrl);
    } catch (error) {
        console.error("[SpecialSearch] Error cleaning URL:", error);
    }
}

export default SpecialSearch;
