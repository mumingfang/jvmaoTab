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
      chrome.storage.sync.set(dataToSave, function (res) {
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
      chrome.storage.sync.get(cloudOptions, function (result) {
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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.type) {
    case "setOptions":
      setOption(sendResponse, request.data);
      break;
    case "getOption":
      getOption(sendResponse);
      break;
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

  chrome.storage.local.get(['contextMenusData'], function (res) {
    let saveData = [];
    if (res?.contextMenusData?.length > 0) {
      saveData = [
        ...res.contextMenusData,
        _data,
      ];
    } else {
      saveData = [_data]
    }
    chrome.storage.local.set({
      'contextMenusData': saveData
    });
  });
}

// 在background script中创建右键菜单项
chrome.runtime.onInstalled.addListener(function () {
  // 创建一个右键菜单项，只在用户右键点击图片时显示
  chrome.contextMenus.create({
    id: "imageMenu",
    title: "将图片存储至便签",
    contexts: ["image"], // 只在用户右键点击图片时显示这个菜单项
  });

  // 创建一个右键菜单项，只在用户选中文本时显示
  chrome.contextMenus.create({
    id: "textMenu",
    title: "将选中文本存储至便签",
    contexts: ["selection"], // 只在用户选中文本时显示这个菜单项
  });
});

// 监听右键菜单项的点击事件
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "imageMenu") {
    // console.log("用户右键点击了图片，图片的URL是：", info);
    setContextMenusData('image', info, tab);
  } else if (info.menuItemId === "textMenu") {
    // console.log("用户选中了文本，选中的文本是：", info, tab);
    // setContextMenusData('text', info, tab);
    chrome.tabs.sendMessage(tab.id, {
      type: "onTextMenuCS"
    }, function (response) {
      if (chrome.runtime.lastError || !response?.html) {
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