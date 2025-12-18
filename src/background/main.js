import { browserApi, getLastError } from "@/utils/browser";

const cloudOptions = ['soList', 'activeSo', 'translateList', 'activeTranslate', 'linkSpan', 'copyClose', 'pwKey', 'defaultOpenAdd', 'soStyleIsRound', 'soAOpen', 'defauiltLink', 'isSoBarDown', 'linkOpenSelf', 'customkey', 'systemTheme', 'showHomeClock', 'homeLinkMaxNum', 'rollingBack', 'soHdCenter', 'tabTitle', 'webDavURL', 'webDavUsername', 'webDavPassword', 'webDavDir', 'homeImgOpacity'];

let optionsValue = {};
let saveOptionsValue = {};
let getOptionTime = 0;
let setOptionTime = 0;

// 防抖
const debounce = (fn, delay) => {
  let timer;

  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn.apply(this, args);
    })

    return timer
  }
}

const setOption = (sendResponse, values) => {
  setOptionTime = Date.now();

  const data = {};
  for (const key in values) {
    if (Object.hasOwnProperty.call(values, key)) {
      if (cloudOptions.includes(key)) {
        data[key] = values[key];
      }
    }
  }
  saveOptionsValue = {
    ...saveOptionsValue,
    ...data
  };
  setTimeout(() => {
    if (setOptionTime > Date.now()) {
      return;
    }

    if (Object.keys(saveOptionsValue).length > 0) {
      const dataToSave = {
        ...saveOptionsValue
      };
      saveOptionsValue = {};
      browserApi?.storage?.sync?.set(dataToSave, function () {
        getOptionTime = 0;
      });
    }
  }, 1000);

  sendResponse('seccusss');

}

const _getOption = () => {
  return new Promise((resolve, reject) => {
    if (getOptionTime + 10 * 60 * 1000 > Date.now()) {
      resolve(optionsValue);
    } else {
      browserApi?.storage?.sync?.get(cloudOptions, function (result) {
        optionsValue = result;
        getOptionTime = Date.now();
        resolve(result);
      })
    }

  })
}

const getOption = (sendResponse, values) => {
  _getOption().then((res) => {
    sendResponse(res);
  })
}

browserApi?.runtime?.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.type) {
    case "setOptions":
      setOption(sendResponse, request.data);
      break;
    case "getOption":
      getOption(sendResponse);
      break;
    case "PAGE_FAVICON_DETECTED":
      // 暂存到 chrome.storage.local，newtab 会定期检查并保存
      if (request.data && request.data.domain && request.data.iconUrl) {
        browserApi?.storage?.local?.get(['pendingFavicons'], (result) => {
          const pending = result.pendingFavicons || [];
          // 避免重复
          const exists = pending.find((p) => p.domain === request.data.domain);
          if (!exists) {
            pending.push({
              domain: request.data.domain,
              iconUrl: request.data.iconUrl,
              size: request.data.size || null,
              timestamp: Date.now(),
            });
            browserApi?.storage?.local?.set({ pendingFavicons: pending });
          }
        });
      }
      sendResponse({ ok: true });
      return true; // 异步响应
  }
  return true;
});

const setContextMenusData = (type, data, tab) => {
  const _data = {
    pageUrl: data.pageUrl,
    title: tab.title,
    type,
    tabId: tab.id
  }
  if (type === 'text') {
    _data.text = data.selectionText
  } else {
    _data.imgUrl = data.srcUrl;
  }

  browserApi?.storage?.local?.get(['contextMenusData'], function (res) {
    let saveData = [];
    if (res?.contextMenusData?.length > 0) {
      saveData = [
        ...res.contextMenusData,
        _data,
      ];
    } else {
      saveData = [_data]
    }
    browserApi?.storage?.local?.set({
      'contextMenusData': saveData
    });
  });
}

// 在background script中创建右键菜单项
browserApi?.runtime?.onInstalled.addListener(function () {
  // 创建一个右键菜单项，只在用户右键点击图片时显示
  browserApi?.contextMenus?.create({
    id: "imageMenu",
    title: "将图片存储至便签",
    contexts: ["image"], // 只在用户右键点击图片时显示这个菜单项
  });

  // 创建一个右键菜单项，只在用户选中文本时显示
  browserApi?.contextMenus?.create({
    id: "textMenu",
    title: "将选中文本存储至便签",
    contexts: ["selection"], // 只在用户选中文本时显示这个菜单项
  });
});

// 监听右键菜单项的点击事件
browserApi?.contextMenus?.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "imageMenu") {
    // console.log("用户右键点击了图片，图片的URL是：", info);
    setContextMenusData('image', info, tab);
  } else if (info.menuItemId === "textMenu") {
    // console.log("用户选中了文本，选中的文本是：", info, tab);
    // setContextMenusData('text', info, tab);
    browserApi?.tabs?.sendMessage(tab.id, {
      type: "onTextMenuCS"
    }, function (response) {
      if (getLastError() || !response?.html) {
        // 如果没有收到消息，默认走info
        setContextMenusData('text', info, tab);
      } else {
        // 正常处理响应
        setContextMenusData('text', {
          ...info,
          selectionText: response.html
        }, tab);
      }
    });
  }
});