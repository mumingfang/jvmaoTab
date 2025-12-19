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
import {
  getID
} from "~/utils";

const localStorageKeys = ['bgType', 'bg2Type', 'bgBase64', 'bg2Base64', 'webdavVersion'];

const v = 14;
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
    pwKey: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'b', 'a', 'b', 'a'],
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
  }
}


export default class OptionStores {
  isInit = false;
  item = {};
  showHide = false;
  isResetOption = false;
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
        .then((res) => {

          if (res.length === 0) {
            this.update(0);
            setTimeout(() => {
              this.rootStore.home.onLoadBg();
            }, 1000);
            return;
          }


          res.forEach((item) => {
            this.item[item.key] = item.value;
          });


          this.isInit = true;

          chrome.runtime.sendMessage({
            type: "getOption",
          }, (response) => {
            for (const key in response) {
              const v = response[key];
              if (typeof this.item[key] !== 'undefined') {
                let equation = true;
                switch (true) {
                  case _.isArray(v):
                    equation = _.isEqual(this.item[key], v);
                    break;
                  case _.isObject(v):
                    equation = _.isEqual(this.item[key], v);
                    break;
                  default:
                    equation = this.item[key] == v
                    break;
                }

                if (!equation) {
                  this.setItem(key, v, false);
                }
              }
            }

            if (this.item["v"] != v) {
              this.update(this.item["v"] || 0);
            }
            this.rootStore.data.init();

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

      chrome.runtime.sendMessage({
        type: "getOption",
      }, (response) => {

        for (const key in response) {
          const v = response[key];
          if (typeof defaultOption[key] !== 'undefined') {
            defaultOption[key] = v
          }
        }

        if (typeof home_id !== 'undefined') {
          defaultOption["homeId"] = home_id
        }

        console.log('%c [ defaultOption ]-181', 'font-size:13px; background:pink; color:#bf2c9f;', defaultOption)

        Object.keys(defaultOption).forEach((key) => {

          if (typeof this.item[key] === "undefined" || home_id && key === 'homeId') {
            this.setItem(key, defaultOption[key]);
          }
        });
        this.setItem("v", v);
        this.isInit = true;
      });

    } catch (error) {
      console.error(error);
      this.rootStore.tools.error('数据更新失败, T101');
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
          console.log('%c [ res ]-241', 'font-size:13px; background:pink; color:#bf2c9f;', res)
          if (res.length === 0) {
            return;
          }
          res.forEach((item) => {
            this.item[item.key] = item.value;
            data[item.key] = item.value;

          });
          console.log('%c [ data ]-248', 'font-size:13px; background:pink; color:#bf2c9f;', data)
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
    console.log('%c [ value ]-225', 'font-size:13px; background:pink; color:#bf2c9f;', key, value)
    this.item[key] = value;
    return this.setOption(key, value).then(() => {
      if (save) {
        chrome.runtime.sendMessage({
          type: "setOptions",
          data: {
            [key]: value
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