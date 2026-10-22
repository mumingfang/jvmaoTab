import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import {
  db
} from "~/db";
import _ from "lodash";
import { DEFAULT_HIDDEN_SHORTCUT } from "~/utils/hiddenShortcut";
import {
  getID
} from "~/utils";

const localStorageKeys = ['bgType', 'bg2Type', 'bgBase64', 'bg2Base64', 'webdavVersion', 'webdavDataEtag'];

const v = 16;
const updateOptions = {
  1: {
    errData: '9527'
  },
  2: {
    homeId: getID(),
    soList: ["Google", "Baidu", "Bing", "DuckDuckGo", 'Bilibili', "Yuanbao", "DeepSeek", "Doubao"],
    activeSo: "Google",
    translateList: ["Google", "Baidu"],
    activeTranslate: "Google",
    bgColor: "#fff",
    bgType: "bing",
    bgUrl: "",
    bgBase64: "",
    bg2Type: "null",
    bg2Url: "",
    bg2Base64: "",
    linkSpan: 4,
    copyClose: false,
    pwKey: DEFAULT_HIDDEN_SHORTCUT,
    defaultOpenAdd: false,
  },
  3: {
    soStyleIsRound: true,
  },
  4: {
    soAOpen: false
  },
  5: {
    homeNoteData: [],
  },
  6: {
    defauiltLink: false,
    isSoBarDown: false,
    homeLinkTimeKey: '',
    bgColor: '#e0c7b0',
  },
  7: {
    linkOpenSelf: true,
  },
  8: {
    customkey: []
  },
  9: {
    showLinkNav: true,
  },
  10: {
    systemTheme: 'auto',
    showHomeClock: false,
    homeLinkMaxNum: 14,
    rollingBack: false,
    soHdCenter: false,
    tabTitle: '橘猫起始页',
  },
  11: {
    webdavVersion: 1,
    webdavTime: 3,
  },
  12: {
    homeImgOpacity: 0.2,
  },
  13: {
    noteTab: [{
      key: `note_1`,
      id: 1,
      title: '便签',
    }],
    addMinNoteTabNum: 2,
    hasNoteTrash: false,
  },
  14: {
    bgImageFit: 'cover',
    bg2ImageFit: 'cover',
  },
  15: {
    homeGlassEffect: false,
  },
  16: {
    showSearchResultNav: true,
  }
}

const arrayOptionFallbacks = {
  soList: updateOptions[2].soList,
  translateList: updateOptions[2].translateList,
  pwKey: updateOptions[2].pwKey,
  homeNoteData: updateOptions[5].homeNoteData,
  customkey: updateOptions[8].customkey,
  noteTab: updateOptions[13].noteTab,
};

const normalizeOptionValue = (key, value) => {
  if (Object.prototype.hasOwnProperty.call(arrayOptionFallbacks, key) && !Array.isArray(value)) {
    return _.cloneDeep(arrayOptionFallbacks[key]);
  }
  return value;
};

const isInvalidOptionValue = (key, value) => {
  return Object.prototype.hasOwnProperty.call(arrayOptionFallbacks, key) && !Array.isArray(value);
};


export default class OptionStores {
  isInit = false;
  item = {};
  showHide = false;
  isResetOption = false;
  isRestoringWebDAV = false;
  rootStore;

  constructor(rootStore) {
    makeObservable(this, {
      item: observable,
      isInit: observable,
      showHide: observable,
      isResetOption: observable,
      getItem: computed,
      setItem: action,
      update: action,
      init: action,
      resetChromeSaveOption: action,
      resetOption: action,
      getSystemTheme: action,
    });
    this.rootStore = rootStore;
  }

  async init() {
    if (!db.isOpen()) {
      await db.open();
    }
    setTimeout(() => {
      db.option
        .toArray()
        .then(async (res) => {

          if (res.length === 0) {
            // 检查 Chrome Storage Sync 是否有 WebDAV 配置，尝试恢复数据
            try {
              const syncData = await new Promise((resolve, reject) => {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                  chrome.storage.sync.get(['webDavURL', 'webDavUsername', 'webDavPassword', 'webDavDir', 'webdavExpectedRemote'], (result) => {
                    if (chrome.runtime.lastError) {
                      reject(chrome.runtime.lastError);
                    } else {
                      resolve(result);
                    }
                  });
                } else {
                  resolve({});
                }
              });

              // 如果存在完整的 WebDAV 配置，尝试恢复
              if (syncData?.webDavURL && syncData?.webDavUsername && syncData?.webDavPassword && syncData?.webDavDir) {
                console.log('[WebDAV恢复] 检测到 Chrome Storage Sync 中有 WebDAV 配置，尝试恢复数据...');
                this.isRestoringWebDAV = true;
                // 等待默认选项真正落盘；固定延时可能让默认链接抢先上传。
                if (!await this.update(0)) throw new Error('初始化选项失败');
                
                // 先设置 webDavURL（确保 data.update() 能正确执行）
                await this.setOption('webDavURL', syncData.webDavURL);
                this.item.webDavURL = syncData.webDavURL;
                
                // 然后并行设置其他 WebDAV 配置
                await Promise.all([
                  this.setOption('webDavUsername', syncData.webDavUsername),
                  this.setOption('webDavPassword', syncData.webDavPassword),
                  this.setOption('webDavDir', syncData.webDavDir),
                ]);
                
                // 将配置同步到 item 中
                this.item.webDavUsername = syncData.webDavUsername;
                this.item.webDavPassword = syncData.webDavPassword;
                this.item.webDavDir = syncData.webDavDir;
                
                // 设置 WebDAV 开启状态和版本号
                await this.setOption('webdavOpen', true);
                await this.setOption('webdavVersion', syncData.webdavVersion || 1);
                const expectedRemote = syncData.webdavExpectedRemote ?? true;
                await this.setOption('webdavExpectedRemote', expectedRemote);
                this.item.webdavOpen = true;
                this.item.webdavVersion = syncData.webdavVersion || 1;
                this.item.webdavExpectedRemote = expectedRemote;
                
                // 标记已初始化，避免后续流程再次触发
                this.isInit = true;
                
                await this.rootStore.data.init();
                if (this.rootStore.data.ready) {
                  this.isRestoringWebDAV = false;
                  this.rootStore.link.init();
                  this.rootStore.home.onLoadBg();
                }
                
                return;
              }
            } catch (error) {
              console.error('[WebDAV恢复] 检查 Chrome Storage Sync 失败:', error);
              // 如果检查失败，继续走原有的新安装逻辑
            }
            
            // 没有 WebDAV 配置或检查失败，走原有的新安装逻辑
            this.update(0);
            setTimeout(() => {
              this.rootStore.home.onLoadBg();
            }, 1000);
            return;
          }


          res.forEach((item) => {
            const value = normalizeOptionValue(item.key, item.value);
            this.item[item.key] = value;
            if (value !== item.value) {
              this.setOption(item.key, value);
            }
          });


          this.isInit = true;

          chrome.runtime.sendMessage({
            type: "getOption",
          }, async (response = {}) => {
            const pendingWrites = [];
            for (const key in response) {
              const rawValue = response[key];
              const value = normalizeOptionValue(key, rawValue);
              if (typeof this.item[key] !== 'undefined') {
                let equation = true;
                switch (true) {
                  case _.isArray(value):
                    equation = _.isEqual(this.item[key], value);
                    break;
                  case _.isObject(value):
                    equation = _.isEqual(this.item[key], value);
                    break;
                  default:
                    equation = this.item[key] === value;
                    break;
                }

                if (!equation) {
                  pendingWrites.push(this.setItem(key, value, isInvalidOptionValue(key, rawValue)));
                }
              }
            }

            try {
              await Promise.all(pendingWrites);
              if (this.item["v"] !== v && !await this.update(this.item["v"] || 0)) {
                throw new Error('本地选项升级失败');
              }
              await this.rootStore.data.init();
            } catch (error) {
              this.rootStore.tools.error(`初始化同步失败: ${error.message}`);
            }

          });

        })
        .catch((err) => {
          if (err.name === "DatabaseClosedError") {
            window.location.reload();
          }
          console.error(err);
        });
    }, 0);
  }


  // 递归获取所有初始数据
  getNewOptionToValue(v, _option) {
    let newValue = v + 1;
    let option = {}
    if (updateOptions[newValue]) {
      option = {
        ..._option,
        ...updateOptions[newValue]
      }

      if (updateOptions[newValue + 1]) {
        return this.getNewOptionToValue(newValue, option);
      }
    }
    return option;
  }

  // 更新数据
  update(_v, home_id) {
    try {
      const defaultOption = this.getNewOptionToValue(_v, this.item);
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getOption" }, async (response = {}) => {
          try {
            for (const key in response) {
              const value = normalizeOptionValue(key, response[key]);
              if (typeof defaultOption[key] !== 'undefined') defaultOption[key] = value;
            }
            if (typeof home_id !== 'undefined') defaultOption.homeId = home_id;
            for (const key of Object.keys(defaultOption)) {
              if (typeof this.item[key] === 'undefined' || isInvalidOptionValue(key, this.item[key]) || home_id && key === 'homeId') {
                await this.setItem(key, defaultOption[key]);
              }
            }
            await this.setItem('v', v);
            this.isInit = true;
            resolve(true);
          } catch (error) {
            console.error(error);
            this.rootStore.tools.error('数据更新失败, T101');
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error(error);
      this.rootStore.tools.error('数据更新失败, T101');
      return Promise.resolve(false);
    }
  }

  get getItem() {
    return this.item;
  }

  getHomeId() {
    return new Promise((resolve, reject) => {
      if (this.item["homeId"]) {
        resolve(this.item["homeId"]);
      } else {
        this.getOption("homeId").then((res) => {
          if (res) {
            resolve(res);
          } else {
            let i = 0;
            const t = setInterval(() => {
              i += 1;
              if (i > 10) {
                clearInterval(t);
              }
              this.getOption("homeId").then((res) => {
                if (res) {
                  resolve(res);
                  clearInterval(t);
                }
              })
            }, 50)
          }
        })
      }
    })
  }

  // 基于本地数据库强制更新线上选项
  resetChromeSaveOption() {
    return new Promise((resolve, reject) => {
      const data = {};
      db.option
        .toArray()
        .then((res) => {
          if (res.length === 0) {
            reject(new Error('导入后选项表为空'));
            return;
          }
          res.forEach((item) => {
            const value = normalizeOptionValue(item.key, item.value);
            this.item[item.key] = value;
            data[item.key] = value;

          });
          chrome.runtime.sendMessage({
            type: "setOptions",
            data,
          }, function (response) {
            resolve();
          });
        })
        .catch((err) => {
          reject(err);
          console.error(err);
        });
    })

  }

  setItem(key, value, save = true) {
    const normalizedValue = normalizeOptionValue(key, value);
    this.item[key] = normalizedValue;
    return this.setOption(key, normalizedValue).then(() => {
      if (save) {
        chrome.runtime.sendMessage({
          type: "setOptions",
          data: {
            [key]: normalizedValue
          }
        }, function (response) {

        });
      }

    })
  }

  getOption(key, returnAll = false) {
    return new Promise((resolve, reject) => {
      db.option
        .where("key")
        .anyOf([key])
        .toArray()
        .then((res) => {
          if (res.length > 0) {
            if (returnAll) {
              resolve(res[0]);
            } else {
              resolve(res[0]["value"]);
            }
          } else {
            resolve(null);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  setOption(key, value) {
    return new Promise((resolve, reject) => {
      this.getOption(key, true).then((res) => {
        if (res?.id) {
          db.option.update(res.id, {
            value
          }).then(() => {
            if (!localStorageKeys.includes(key)) {
              this.rootStore.data.update();
            }
            resolve();
          }).catch(reject);
        } else {
          db.option.add({
            key,
            value
          }).then(() => {
            this.rootStore.data.update();
            resolve();
          }).catch(reject);
        }
      });
    });
  }

  resetOption() {
    try {
      this.getHomeId().then((homeId) => {
        this.item = {
          homeId,
        };
        db.option.clear().then(() => {
          this.update(0, homeId);
          setTimeout(() => {
            window.location.reload();
          }, 6000);
        }).catch(error => {
          console.error('清空表时发生错误', error);
          this.rootStore.tools.error('设置重置失败—清空表时发生错误');
        });

      });
    } catch (error) {
      console.log('%c [ error ]-297', 'font-size:13px; background:pink; color:#bf2c9f;', error)
      this.rootStore.tools.error('设置重置失败');
    }
  }

  /// -----

  getSystemTheme = () => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (this.item.systemTheme == 'auto' && isDarkMode || this.item.systemTheme == 'dark') {
      return 'dark';
    }
    return 'white';
  }
}
