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
import { handleError } from "~/utils/errorHandler";
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
        // 删除测试文件，忽略删除错误（文件可能不存在）
        this.client.deleteFile(dir + '/jvmao-init.text').catch(() => {});
        this.readFile(dir + devVName).then((data) => {
          if (data) {
            resolve(1); // 远端有数据
          } else {
            resolve(0); // 远端无数据
          }
        }).catch((error) => {
          resolve(0); // 远端无数据
        })
      }).catch((error) => {
        handleError(error, "DataStores.test");
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
    // 如果正在执行同步操作，跳过本次拉取
    if (this.lock) {
      console.log('同步操作进行中，跳过本次拉取');
      return;
    }

    const {
      webdavVersion = 1,
    } = this.rootStore.option.item;

    this.readFile(this.dir + devVName).then((data) => {

      if (!data || data.trim() === '') {
        // 远端没有版本号文件，推送本地数据
        this.push();
        return;
      }

      // 兼容旧版本版本号可能是字符串的情况
      let yunNyum = parseInt(data);
      let num = parseInt(webdavVersion);
      
      // 如果解析失败，尝试从字符串中提取数字（兼容旧版本）
      if (isNaN(yunNyum)) {
        const match = String(data).match(/\d+/);
        if (match) {
          yunNyum = parseInt(match[0]);
          console.warn('远端版本号格式异常，已自动修复:', data, '->', yunNyum);
        }
      }
      
      if (isNaN(num)) {
        const match = String(webdavVersion).match(/\d+/);
        if (match) {
          num = parseInt(match[0]);
          console.warn('本地版本号格式异常，已自动修复:', webdavVersion, '->', num);
        }
      }
      
      // 判断这两个值是否是NaN
      if (isNaN(yunNyum) || isNaN(num)) {
        this.rootStore.tools.error(`同步拉取异常: 版本号格式错误 (远端: ${data}, 本地: ${webdavVersion})`);
        return;
      }
      
      if (yunNyum == num) {
        // 版本号相同，无需同步
        return;
      } else if (yunNyum < num) {
        // 远端版本号小于本地，推送本地数据
        this.push();
        return;
      } else {
        // 远端版本号大于本地，拉取远端数据
        this._pull(yunNyum);
      }
    }).catch((error) => {
      if (error.message && error.message.includes('404')) {
        // 远端文件不存在，推送本地数据
        this.push();
      } else {
        this.rootStore.tools.error(`同步拉取异常: ${error.message || '未知错误'}`);
      }

    });
  }

  _pull = async (webdavVersion) => {
    // 兼容旧版本版本号可能是字符串的情况
    let versionNum = parseInt(webdavVersion);
    if (isNaN(versionNum)) {
      // 尝试从字符串中提取数字
      const match = String(webdavVersion).match(/\d+/);
      if (match) {
        versionNum = parseInt(match[0]);
        console.warn('版本号格式异常，已自动修复:', webdavVersion, '->', versionNum);
      } else {
        console.error('拉取远端错误: webdavVersion 不是有效数字', webdavVersion);
        return;
      }
    }
    webdavVersion = versionNum; // 使用修复后的版本号

    const {
      option,
      link,
      note,
      tools
    } = this.rootStore;
    
    // 先备份当前数据，以防导入失败
    let backupBlob = null;
    try {
      backupBlob = await this.get_dbData();
    } catch (error) {
      console.error('备份数据失败:', error);
      // 即使备份失败也继续，但会记录错误
    }

    try {
      this.lock = true;
      this.waitType = 'pull';
      localStorageKeys.forEach((key) => {
        const value = option.item[key];
        if (value) {
          this.cache[key] = value;
        }
      });

      // 读取远端数据文件
      const data = await this.readFile(this.dir + devJsonName);
      
      if (!data || data.trim() === '') {
        throw new Error('远端数据文件为空');
      }

      const blob = new Blob([data], {
        type: 'application/json'
      });

      // 解析 JSON 数据
      const text = await blob.text();
      if (!text || text.trim() === '') {
        throw new Error('远端数据内容为空');
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`远端数据格式错误: ${parseError.message}`);
      }

      // 验证数据完整性（兼容旧版本）
      if (!json || !json.data) {
        throw new Error('远端数据格式不完整：缺少 data 字段');
      }

      // 数据库名称验证（旧版本可能没有此字段，所以只验证存在时是否匹配）
      if (json.data.databaseName && json.data.databaseName !== 'jvmao-tab') {
        throw new Error(`数据库名称不匹配: 期望 jvmao-tab，实际 ${json.data.databaseName}`);
      }

      // 数据库版本验证（旧版本可能没有此字段，使用默认值）
      let databaseVersion = json.data.databaseVersion;
      if (!databaseVersion) {
        console.warn('远端数据缺少 databaseVersion 字段，使用默认版本 1.5（兼容旧版本）');
        databaseVersion = 1.5; // 使用默认版本，兼容旧版本数据
      }

      // 验证数据表是否存在且不为空（兼容旧版本可能没有 tables 字段的情况）
      // 注意：旧版本的数据格式可能不同，所以这里只做基本验证
      if (json.data.tables) {
        const tableKeys = Object.keys(json.data.tables);
        if (tableKeys.length === 0) {
          throw new Error('远端数据表为空，拒绝导入以避免数据丢失');
        }
        // 验证至少有一些基本表存在
        const requiredTables = ['option', 'link', 'note'];
        const hasRequiredTable = requiredTables.some(table => tableKeys.includes(table));
        if (!hasRequiredTable) {
          console.warn('远端数据缺少基本表，但继续导入（兼容旧版本）');
        }
      } else {
        // 旧版本可能没有 tables 字段，但数据可能在其他位置
        console.warn('远端数据缺少 tables 字段，尝试继续导入（兼容旧版本）');
        // 不抛出错误，让 db.import 来处理
      }

      // 只有在验证通过后才删除数据库
      await db.delete();

      if (!db.isOpen()) {
        await db.open();
      }

      // 导入数据
      await db.import(blob, {
        noTransaction: false,
        clearTables: true,
        acceptVersionDiff: true,
        progressCallback
      });

      // 验证导入后的数据
      const importedData = await this.get_dbData();
      if (!importedData || importedData.size === 0) {
        throw new Error('导入后数据验证失败：数据为空或大小为0');
      }

      // 验证导入的数据至少包含一些表（兼容旧版本）
      try {
        const importedText = await importedData.text();
        const importedJson = JSON.parse(importedText);
        if (!importedJson.data) {
          throw new Error('导入后数据验证失败：缺少 data 字段');
        }
        // 旧版本可能没有 tables 字段，所以只验证存在时不为空
        if (importedJson.data.tables && Object.keys(importedJson.data.tables).length === 0) {
          throw new Error('导入后数据验证失败：数据表为空');
        }
        // 如果没有 tables 字段，可能是旧版本格式，不强制要求
        if (!importedJson.data.tables) {
          console.warn('导入的数据缺少 tables 字段（可能是旧版本格式），但数据已成功导入');
        }
      } catch (verifyError) {
        // 如果是解析错误，可能是旧版本格式，尝试继续
        if (verifyError.message.includes('tables')) {
          console.warn('数据验证警告（可能是旧版本格式）:', verifyError.message);
          // 不抛出错误，允许继续
        } else {
          throw new Error(`导入后数据验证失败: ${verifyError.message}`);
        }
      }

      // 导入成功，更新版本号
      setTimeout(() => {
        option.setItem('webdavVersion', parseInt(webdavVersion)); // 强行刷新版本号
        localStorageKeys.forEach((key) => {
          if (key != 'webdavVersion') {
            const value = this.cache[key];
            option.setItem(key, value);
          }
        });
        option.resetChromeSaveOption().then(() => {
          // 数据拉取成功
        }).catch((error) => {
          console.error(error);
          tools.error(`同步数据错误: ${error.message}`);
        }).finally(() => {
          setTimeout(() => {
            link.restart();
            note.init();
            this.lock = false;
            this.waitType = '';
            
            if (db.verno !== databaseVersion) {
              db.__upgrade(db);
            }
          }, 200);
        });
      }, 0);

    } catch (error) {
      handleError(error, "DataStores._pull");
      
      // 如果导入失败且有备份，尝试恢复
      if (backupBlob && backupBlob.size > 0) {
        try {
          console.log('尝试恢复备份数据...');
          // 确保数据库已关闭再删除
          if (db.isOpen()) {
            await db.close();
          }
          await db.delete();
          if (!db.isOpen()) {
            await db.open();
          }
          await db.import(backupBlob, {
            noTransaction: false,
            clearTables: true,
            acceptVersionDiff: true,
            progressCallback
          });
          
          // 验证恢复后的数据
          const restoredData = await this.get_dbData();
          if (!restoredData || restoredData.size === 0) {
            throw new Error('恢复后的数据验证失败：数据为空');
          }
          
          console.log('备份数据恢复成功');
          tools.error(`同步失败，已恢复本地数据: ${error.message}`);
        } catch (restoreError) {
          handleError(restoreError, "DataStores._pull.restoreBackup");
          // 恢复失败，数据库可能处于不一致状态
          // 尝试重新打开数据库
          try {
            if (!db.isOpen()) {
              await db.open();
            }
          } catch (openError) {
            handleError(openError, "DataStores._pull.reopenDb");
          }
          tools.error(`同步失败且无法恢复数据: ${error.message}。恢复备份失败: ${restoreError.message}。请手动重新加载页面。`);
        }
      } else {
        if (!backupBlob) {
          console.error('没有备份数据，无法恢复');
        } else {
          console.error('备份数据为空，无法恢复');
        }
        tools.error(`同步拉取失败: ${error.message}。无法恢复数据，请检查远端数据是否正常。`);
      }

      // 重置状态（即使恢复失败也要释放锁，避免永久锁定）
      this.lock = false;
      this.waitType = '';
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
    // 如果正在执行同步操作，跳过本次推送
    if (this.lock) {
      console.log('同步操作进行中，跳过本次推送');
      return;
    }

    const {
      webdavVersion
    } = this.rootStore.option.item;

    this.lock = true;
    this.waitType = 'push';
    this.get_dbData().then((blob) => {
      // 验证导出的数据不为空
      if (!blob || blob.size === 0) {
        throw new Error('导出的数据为空，无法推送');
      }

      // 先写入数据文件
      this.writeFile(this.dir + devJsonName, blob).then((data) => {
        // 兼容旧版本版本号可能是字符串的情况
        let num = parseInt(webdavVersion);
        if (isNaN(num)) {
          // 尝试从字符串中提取数字
          const match = String(webdavVersion).match(/\d+/);
          if (match) {
            num = parseInt(match[0]);
            console.warn('版本号格式异常，已自动修复:', webdavVersion, '->', num);
          } else {
            // 如果无法修复，使用时间戳
            num = new Date().getTime();
            console.warn('版本号无法修复，使用时间戳:', num);
          }
          this.rootStore.option.setItem('webdavVersion', num);
        }
        const versionBlob = new Blob([num.toString()], {
          type: 'text/plain'
        });

        // 等待版本号文件写入完成后再释放锁
        // 如果版本号写入失败，需要回滚数据文件（可选，但为了数据一致性）
        this.writeFile(this.dir + devVName, versionBlob).then(() => {
          this.lock = false;
          this.waitType = '';
          console.log('数据推送成功，版本号:', num);
        }).catch((error) => {
          console.error('写入版本号文件失败:', error);
          // 版本号写入失败，但数据文件已写入，这会导致数据不一致
          // 尝试删除已写入的数据文件，避免不一致
          this.client.deleteFile(this.dir + devJsonName).catch(() => {
            // 删除失败也继续，至少记录错误
            console.error('无法删除已写入的数据文件，可能导致数据不一致');
          });
          this.rootStore.tools.error(`同步版本号错误: ${error.message}。数据文件已写入但版本号未更新，可能导致数据不一致`);
          this.lock = false;
          this.waitType = '';
        });
      }).catch((error) => {
        console.error('写入数据文件失败:', error);
        this.rootStore.tools.error(`同步数据错误: ${error.message}`);
        this.lock = false;
        this.waitType = '';
      });

    }).catch((error) => {
      console.error('获取数据库数据失败:', error);
      this.rootStore.tools.error(`获取数据错误: ${error.message}`);
      this.lock = false;
      this.waitType = '';
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

    // 验证版本号是否有效
    const currentVersion = parseInt(webdavVersion);
    if (isNaN(currentVersion)) {
      console.error('当前版本号无效，重置为时间戳:', webdavVersion);
      const newVersion = new Date().getTime();
      this.rootStore.option.setItem('webdavVersion', newVersion);
      this.waitType = 'push';
      this._update();
      return;
    }

    this.waitType = 'push';

    // 安全地增加版本号
    const newVersion = currentVersion + 1;
    if (isNaN(newVersion) || newVersion <= currentVersion) {
      console.error('版本号计算错误，使用时间戳:', currentVersion, newVersion);
      this.rootStore.option.setItem('webdavVersion', new Date().getTime());
    } else {
      this.rootStore.option.setItem('webdavVersion', newVersion);
    }
    this._update();
  }

  get_dbData = () => {
    return new Promise((resolve, reject) => {
      try {
        db.export({
          prettyJson: true,
          progressCallback: () => {},
          // 不同步的表：
          // - cache: 本地缓存数据
          // - favicon: 本地按域名缓存的站点图标（体积大且可重新生成）
          skipTables: ['cache', 'favicon'],
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
        handleError(error, "DataStores.writeFile");
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