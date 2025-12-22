const manifestFirefox = {
  // Firefox 目前对 MV3 支持不完全，这里使用 MV2 风格的 manifest
  manifest_version: 2,
  name: "橘猫起始页",
  version: "1.3.6",
  description: "起始页还可以是这样的",
  homepage_url: "https://www.jvmao.net",

  // 为 Firefox 指定扩展 ID 及最低版本（提交 AMO 时可根据需要调整）
  browser_specific_settings: {
    gecko: {
      id: "newtab@jvmao.net",
      strict_min_version: "140.0",
      // 声明数据收集权限：
      // - 本扩展不收集或传输任何个人数据，因此使用 "none"
      // 文档：https://mzl.la/firefox-builtin-data-consent
      data_collection_permissions: {
        required: ["none"],
      },
    },
  },

  icons: {
    "16": "16x16.png",
    "48": "48x48.png",
    "128": "128x128.png",
  },

  chrome_url_overrides: {
    newtab: "src/newtab/index.html",
  },

  // MV2 中不支持 host_permissions，统一放到 permissions 里
  permissions: [
    "tabs",
    "storage",
    "contextMenus",
    "<all_urls>",
  ],

  // 使用 event page 形式的 background，与当前 background/main.js 兼容
  background: {
    scripts: ["src/background/main.js"],
    persistent: false,
  },

  content_scripts: [
    {
      matches: ["<all_urls>"],
      // 保持与原始 manifest 一致，由插件从 HTML 生成对应 JS chunk
      js: ["src/content/index.html"],
      css: [],
      run_at: "document_end",
    },
  ],

  // MV2 中 content_security_policy 是字符串形式
  content_security_policy: "script-src 'self'; object-src 'self';",

  // MV2 里 web_accessible_resources 是字符串数组
  web_accessible_resources: [
    "_favicon/*",
    "default-favicon.svg",
  ],
};

export default manifestFirefox;


