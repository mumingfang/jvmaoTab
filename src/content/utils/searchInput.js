/**
 * 常见搜索引擎的搜索框选择器配置
 * 格式：hostname -> selector
 * 支持多个选择器，按顺序尝试，直到找到匹配的元素
 */
export const SEARCH_INPUT_SELECTORS = {
    "www.baidu.com": ["input[name='wd']", "#kw", "input#kw"],
    "baidu.com": ["input[name='wd']", "#kw", "input#kw"],
    "www.google.com": ["input[name='q']", "textarea[name='q']", "input[type='text']"],
    "google.com": ["input[name='q']", "textarea[name='q']", "input[type='text']"],
    "google.com.hk": ["input[name='q']", "textarea[name='q']", "input[type='text']"],
    "www.bing.com": ["input[name='q']", "#sb_form_q"],
    "bing.com": ["input[name='q']", "#sb_form_q"],
    "cn.bing.com": ["input[name='q']", "#sb_form_q"],
    "www.duckduckgo.com": ["input[name='q']", "#search_form_input"],
    "duckduckgo.com": ["input[name='q']", "#search_form_input"],
    "www.sogou.com": ["input[name='query']", "#query"],
    "sogou.com": ["input[name='query']", "#query"],
    "www.so.com": ["input[name='q']", "#input"],
    "so.com": ["input[name='q']", "#input"],
    "s.taobao.com": ["input[name='q']", "#q"],
    "search.jd.com": ["input[name='keyword']", "#key"],
    "search.smzdm.com": ["input[name='s']", "#searchInput"],
    "search.bilibili.com": ["input[name='keyword']", "input[placeholder*='搜索']"],
    "www.xiaohongshu.com": ["input[name='keyword']", "input[placeholder*='搜索']"],
    "xiaohongshu.com": ["input[name='keyword']", "input[placeholder*='搜索']"],
    "www.zhihu.com": ["input[name='q']", ".Input"],
    "www.douban.com": ["input[name='q']", "#inp-query"],
    "www.juejin.cn": ["input[name='query']", "input[placeholder*='搜索']"],
    "juejin.cn": ["input[name='query']", "input[placeholder*='搜索']"],
};

/**
 * 获取搜索框元素
 * @param {string} hostname - 当前页面的 hostname
 * @param {string|string[]} customSelector - 自定义选择器（可选）
 * @returns {HTMLInputElement|HTMLTextAreaElement|null}
 */
export function getSearchInputElement(hostname, customSelector = null) {
    // 优先使用自定义选择器
    if (customSelector) {
        const selectors = Array.isArray(customSelector) ? customSelector : [customSelector];
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                    return element;
                }
            } catch (e) {
                // 选择器无效，继续尝试下一个
                continue;
            }
        }
    }

    // 使用默认选择器
    const selectors = SEARCH_INPUT_SELECTORS[hostname];
    if (selectors && Array.isArray(selectors)) {
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                    return element;
                }
            } catch (e) {
                continue;
            }
        }
    }

    // 通用回退：尝试查找 name 属性匹配的 input
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const paramKeys = Array.from(urlParams.keys());
        if (paramKeys.length > 0) {
            const firstParam = paramKeys[0];
            const element = document.querySelector(`input[name='${firstParam}'], textarea[name='${firstParam}']`);
            if (element) {
                return element;
            }
        }
    } catch (e) {
        // 忽略错误
    }

    return null;
}

/**
 * 获取搜索框的当前值
 * @param {string} hostname - 当前页面的 hostname
 * @param {string|string[]} customSelector - 自定义选择器（可选）
 * @returns {string}
 */
export function getSearchInputValue(hostname, customSelector = null) {
    const element = getSearchInputElement(hostname, customSelector);
    if (element) {
        return element.value || "";
    }
    return "";
}

/**
 * 监听搜索框变化
 * @param {string} hostname - 当前页面的 hostname
 * @param {Function} callback - 变化回调函数
 * @param {string|string[]} customSelector - 自定义选择器（可选）
 * @returns {Function} 清理函数
 */
export function watchSearchInput(hostname, callback, customSelector = null) {
    let element = getSearchInputElement(hostname, customSelector);
    const cleanupFunctions = [];

    // 如果元素已存在，直接监听
    if (element) {
        const handleInput = () => {
            callback(element.value || "");
        };
        element.addEventListener('input', handleInput);
        element.addEventListener('change', handleInput);
        cleanupFunctions.push(() => {
            element.removeEventListener('input', handleInput);
            element.removeEventListener('change', handleInput);
        });
    }

    // 使用 MutationObserver 监听 DOM 变化（处理 SPA 动态加载）
    const observer = new MutationObserver(() => {
        const newElement = getSearchInputElement(hostname, customSelector);
        if (newElement && newElement !== element) {
            // 清理旧的监听器
            cleanupFunctions.forEach(fn => fn());
            cleanupFunctions.length = 0;

            // 添加新的监听器
            element = newElement;
            const handleInput = () => {
                callback(element.value || "");
            };
            element.addEventListener('input', handleInput);
            element.addEventListener('change', handleInput);
            cleanupFunctions.push(() => {
                element.removeEventListener('input', handleInput);
                element.removeEventListener('change', handleInput);
            });

            // 立即调用一次，获取当前值
            callback(element.value || "");
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    cleanupFunctions.push(() => {
        observer.disconnect();
    });

    // 返回清理函数
    return () => {
        cleanupFunctions.forEach(fn => fn());
    };
}
