import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import {
  createClient
} from 'webdav';
import {
  db
} from "~/db";
import _ from "lodash";

const devJsonName = '/jvmao-tab.json';
const devVName = '/jvmao-version.txt';

const localStorageKeys = ['bgType', 'bg2Type', 'bgBase64', 'bg2Base64', 'webdavVersion'];

const progressCallback = () => {}
export default class DataStores {
  client = null;
  dir = '';
  lock = false;
  waitType = '';
  cache = {};

  constructor(rootStore) {
    makeObservable(this, {
      waitType: observable,
      test: action,
      init: action,
      pull: action,
      push: action,
      readFile: action,
      writeFile: action,
      get_dbData: action,
      update: action,
    });
    this.rootStore = rootStore;
  }

  test = (url, username, password, dir) => {
    this.client = createClient(url, {
      username,
      password
    });

    const blob = new Blob(['1'], {
      type: 'text/plain'
    });

    return new Promise((resolve, reject) => {
      this.writeFile(dir + '/jvmao-init.text', blob).then((data) => {
        this.client.deleteFile(dir + '/jvmao-init.text');
        this.readFile(dir + devVName).then((data) => {
          console.log('%c [ data ]-56', 'font-size:13px; background:pink; color:#bf2c9f;', data)
          if (data) {
            resolve(1); // 远端有数据
          } else {
            resolve(0); // 远端无数据
          }
        }).catch((error) => {
          resolve(0); // 远端无数据
        })
      }).catch((error) => {
        console.error('Error reading file:', error);
        this.client = null;
        reject();
      });
    });
  }

  init = () => {
    const {
      webDavURL = '',
        webDavUsername = '',
        webDavPassword = '',
        webDavDir = '',
        webdavTime = 3,
    } = this.rootStore.option.item;

    if (!webDavURL || !webDavUsername || !webDavPassword || !webDavDir) {
      return;
    }

    if (!this.client) {
      this.dir = webDavDir;
      this._update = _.debounce(() => {
        this.push();
      }, 1000 * webdavTime)
      this.client = createClient(webDavURL, {
        username: webDavUsername,
        password: webDavPassword
      });
    }

    this.pull();
  }

  pull = () => {
    const {
      webdavVersion = 1,
    } = this.rootStore.option.item;

    this.readFile(this.dir + devVName).then((data) => {
      
      if (!data) {
        this.push();
        return;
      }

      const yunNyum = parseInt(data);
      const num = webdavVersion;
      // 判断这两个值是否是NaN
      if (isNaN(yunNyum) || isNaN(num)) { 
        this.rootStore.tools.error(`同步拉取异常: 未知错误`);
        return;
      }
      console.log('%c [ 同步对比 ]', 'font-size:13px; background:pink; color:#bf2c9f;', yunNyum, num)
      if (yunNyum == num) {
        return;
      } else if (yunNyum < num) {
        this.push();
        return;
      } else {
        this._pull(yunNyum);
      }
    }).catch((error) => {
      if (error.message.includes('404')) {
        this.push();
      } else {
        this.rootStore.tools.error(`同步拉取异常: ${error.message}`);
      }

    });
  }

  _pull = async (webdavVersion) => {
    if (isNaN(webdavVersion)) {
      console.log('%c [ 拉去远端错误， ]-143', 'font-size:13px; background:pink; color:#bf2c9f;', webdavVersion)
      return;
    }

    const {
      option,
      link,
      note,
      tools
    } = this.rootStore;
    try {
      this.lock = true;
      this.waitType = 'pull';
      localStorageKeys.forEach((key) => {
        const value = option.item[key];
        if (value) {
          this.cache[key] = value;
        }
      });
      this.readFile(this.dir + devJsonName).then(async (data) => {
        const blob = new Blob([data], {
          type: 'application/json'
        });
        await db.delete();

        if (!db.isOpen()) {
          await db.open();
        }

        await db.import(blob, {
          noTransaction: false,
          clearTables: true,
          acceptVersionDiff: true,
          progressCallback
        });

        setTimeout(() => {
          option.setItem('webdavVersion', parseInt(webdavVersion)); // 强行刷新版本号
          localStorageKeys.forEach((key) => {
            if (key != 'webdavVersion') {
              const value = this.cache[key];
              option.setItem(key, value);
              // localStorage.removeItem(key);
            }
          });
          option.resetChromeSaveOption().then(() => {
            console.log('%c [ 数据推送成功 ]', 'font-size:13px; background:pink; color:#bf2c9f;')
          }).catch((error) => {
            console.error(error);
            tools.error(`同步数据错误: ${error.message}`);
          }).finally(() => {
            setTimeout(() => {
              link.restart();
              note.init();
              this.lock = false;
              this.waitType = '';
            }, 200);
          });
        }, 0);
      })

    } catch (error) {
      console.error(error.message);
      this.rootStore.tools.error(`${error.message}`);
    }

  };

  toArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  push = () => {
    const {
      webdavVersion
    } = this.rootStore.option.item;

    this.lock = true;
    this.waitType = 'push';
    this.get_dbData().then((blob) => {
      this.writeFile(this.dir + devJsonName, blob).then((data) => {
        let num = parseInt(webdavVersion);
        if (isNaN(num)) {
          num = new Date().getTime();
          this.rootStore.option.setItem('webdavVersion', num);
        }
        const blob = new Blob([num], {
          type: 'text/plain'
        });

        this.writeFile(this.dir + devVName, blob);
        this.lock = false;
        this.waitType = '';

        console.log('%c [ 同步远端成功 ]', 'font-size:13px; background:pink; color:#bf2c9f;', )
      }).catch((error) => {
        console.error(error);
        this.rootStore.tools.error(`同步数据错误: ${error.message}`);
      });

    });
  }

  deleteServeData = () => {
    const {
      option
    } = this.rootStore;

    option.setItem('webDavURL', '');
    option.setItem('webDavUsername', '');
    option.setItem('webDavPassword', '');
    option.setItem('webDavDir', '');

  }

  _update = () => {}

  update = () => {
    const {
      webDavURL,
      webdavVersion = 0,
    } = this.rootStore.option.item;

    if (!webDavURL || this.lock) {
      return;
    }

    this.waitType = 'push';

    this.rootStore.option.setItem('webdavVersion', parseInt(webdavVersion) + 1);
    this._update();
  }

  get_dbData = () => {
    return new Promise((resolve, reject) => {
      try {
        db.export({
          prettyJson: true,
          progressCallback: () => {},
          skipTables: ['cache'],
          transform: (table, value, key) => {
            if (table === 'option') {
              switch (value.key) {
                case 'bgType':
                case 'bg2Type':
                  let type_value = _.cloneDeep(value);
                  if (type_value.value === 'file') {
                    type_value.value = value.key == 'bgType' ? 'bing' : '';
                  }
                  return {
                    value: type_value,
                      key,
                  }
                  break;

                case 'bgBase64':
                case 'bg2Base64':
                  let _value = _.cloneDeep(value);
                  _value.value = '';
                  return {
                    value: _value,
                      key,
                  }
                  break;
              }
            }
            return {
              value,
              key,
            }
          }
        }).then((data) => {
          resolve(data);
        }).catch((error) => {
          reject(error);
        })
      } catch (error) {
        reject(error);
      }
    });
  }

  readFile = (filePath) => {
    return new Promise(async (resolve, reject) => {
      try {
        this.client.getFileContents(filePath, {
          format: "text"
        }).then((content) => {
          resolve(content);
        }).catch((error) => {
          reject(error);
        })
      } catch (error) {
        reject(error);
      }
    });

  };

  // 写入文件内容
  writeFile = (filePath, blob) => {
    return new Promise(async (resolve, reject) => {
      try {
        this.toArrayBuffer(blob).then((blob) => {
          this.client.putFileContents(filePath, blob, {
            overwrite: true
          }).then((content) => {
            resolve(content);
          }).catch((error) => {
            reject(error);
          })
        });
      } catch (error) {
        console.error('Error writing file:', error);
        reject(error);
      }
    });
  };

  listDirectory = (path) => {
    return new Promise((resolve, reject) => {
      try {
        this.client.getDirectoryContents(path).then((data) => {
          resolve(data);
        }).catch((error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  };
}