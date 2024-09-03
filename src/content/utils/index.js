export const get_soText = () => {
    const u = new URL(window.location.href);
    let text = "";
    switch (u.host) {
        case "www.baidu.com":
            text = u.searchParams.get("wd");
            break;
        case "www.google.com":
            text = u.searchParams.get("q");
            break;
        case "www.bing.com":
        case "cn.bing.com":
            text = u.searchParams.get("q");
            break;
        case "www.duckduckgo.com":
        case "duckduckgo.com":
            text = u.searchParams.get("q");
            break;
        case "www.sogou.com":
        case "sogou.com":
            text = u.searchParams.get("query");
            break;
        case "www.so.com":
        case "so.com":
            text = u.searchParams.get("q");
            break;
        case "s.taobao.com":
            text = u.searchParams.get("q");
            break;
        case "search.jd.com":
            text = u.searchParams.get("keyword");
            break;
        case "search.smzdm.com":
            text = u.searchParams.get("s");
            break;
        case "search.bilibili.com":
            text = u.searchParams.get("keyword");
            break;
        case "www.xiaohongshu.com":
        case "xiaohongshu.com":
            text = u.searchParams.get("keyword");
            break;
        case "www.zhihu.com":
            text = u.searchParams.get("q");
            break;
        case "www.douban.com":
            text = u.searchParams.get("q");
            break;
        case "www.juejin.cn":
        case "juejin.cn":
            text = u.searchParams.get("query");
            break;
    }
    return text;
}