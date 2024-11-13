const manifest = {
  manifest_version: 3,
  name: "橘猫起始页",
  version: "1.2.6",
  description: "起始页还可以是这样的",
  homepage_url: "https://www.jvmao.net",
  icons: {
    "16": "16x16.png",
    "48": "48x48.png",
    "128": "128x128.png"
  },
  chrome_url_overrides: {
    newtab: "src/newtab/index.html",
  },
  host_permissions: ["*://*/*"],
  permissions: ["tabs", "favicon", "storage", "contextMenus"],
  web_accessible_resources: [{
    resources: ["_favicon/*"],
    matches: ["<all_urls>"],
    extension_ids: ["*"],
  }, ],
  background: {
    service_worker: "src/background/main.js",
    browser_action: {}
  },
  content_scripts: [{
    matches: ["<all_urls>"],
    js: ["src/content/index.html"],
    css: [],
    run_at: "document_start",
  }, ],
};

export default manifest;