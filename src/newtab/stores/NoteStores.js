import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import api from "~/utils/api";
import {
  db
} from "~/db";
import dayjs from 'dayjs'
import _ from "lodash";
import {
  getID,
  getRandomTimestamp
} from "~/utils";
import {
  MD5
} from 'crypto-js';
import Storage from "~/utils/storage";

const field = ["id", "content", "fromUrl", "sort", "state"];

export default class NoteStores {
  openEditor = false;
  openId = -1;
  activeTabKey = '';

  constructor(rootStore) {
    makeObservable(this, {
      openEditor: observable,
      openId: observable,
      activeTabKey: observable,
      addNote: action,
      getNote: action,
      findNote: action,
      updateNote: action,
      open: action,
      updateActiveTabKey: action,
    });
    this.rootStore = rootStore;
  }

  dataUpdate = _.debounce(() => {
    this.rootStore.data.update();
  }, 1000)

  _init = () => {
    db.note
      .count()
      .then((res) => {
        if (!res) {
          setTimeout(() => {
            const note = [{
              "content": "<p>欢迎使用便签</p><p>小技巧:</p><ol><li><p>在首屏壁任意地方双击可以快捷添加壁纸。</p></li><li><p>右击左侧便签列表可以将此标签贴在首屏。</p></li><li><p>在任意网页选中文本右击可以快速将文本添加至便签。</p></li><li><p>任意网页中右击图片也可以快捷添加。</p></li></ol><p></p><p>如果使用中有任何问题可以加 QQ群 429303318</p><p> </p>",
              "sort": 0,
              "state": 1,
            }];
            this.addNote(note)
          }, 0);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  open = (id) => {
    if (typeof id === 'undefined') {
      Storage.get('noteOpenId').then(({
        openId = '',
      }) => {
        if (openId) {
          this.openId = openId;
        } else {
          this.openId = -1;
        }
      });
    } else {
      this.openId = id;
      Storage.set('noteOpenId', {
        openId: id,
      });
    }

  }

  updateActiveTabKey = (key) => {
    this.activeTabKey = key;
  }

  findNote = (id) => {
    return new Promise((resolve, reject) => {
      db.note
        .get(id)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  getNote = (page = 1, limit = 48, type = 1) => {
    const {
      homeNoteData
    } = this.rootStore.option.item;
    const cIds = [];
    // 过滤掉胶囊
    homeNoteData?.forEach((v) => {
      if (v.type == 'capsule') {
        cIds.push(v.id);
      }
    })
    return new Promise((resolve, reject) => {
      Promise.all([
        db.note.count((note) => note.state == type),
        db.note.where('state').equals(type).reverse()
        .offset((page - 1) * limit)
        .limit(limit)
        .sortBy('updateTime')
        .then((res) => {
          return (res || []).filter((v) => !cIds.includes(v.id))
        })
      ]).then((res) => {
        resolve({
          total: res[0],
          list: res[1]
        })
      }).catch((err) => {
        reject(err)
      })
    });
  }

  addNote = (note) => {
    return new Promise((resolve, reject) => {
      if (Array.isArray(note)) {
        const addList = note.map((v) => {
          const add = _.pick(v, field);
          add["createTime"] = dayjs().format();
          add["updateTime"] = dayjs().format();
          add["sort"] = v?.sort || 0;
          add["state"] = v?.state || 1;
          return add;
        });
        db.note
          .bulkPut(addList)
          .then((res) => {
            this.dataUpdate();
            resolve(res);
          })
          .catch((err) => {
            console.log("addNote", err);
            reject(err);
          });
      } else {
        const add = _.pick(note, field);
        add["createTime"] = dayjs().format();
        add["updateTime"] = dayjs().format();
        add["sort"] = note?.sort || 0;
        add["state"] = note?.state || 1;
        db.note
          .put(add)
          .then((res) => {
            this.dataUpdate();
            resolve(res);
          })
          .catch((err) => {
            console.error("addNote", err);
            reject(err);
          });
      }

    });
  }

  updateNote = (id, note) => {
    return new Promise((resolve, reject) => {
      if (!id) {
        reject('id is null');
        return;
      }
      const update = _.pick(note, field);
      update["updateTime"] = dayjs().format();
      db.note
        .update(id, update)
        .then((res) => {
          this.dataUpdate();
          resolve(res);
        })
        .catch((err) => {
          console.error("updateNote", err);
          reject(err);
        });
    });
  }

  // 软删除 仅更改状态
  delectNote = (id) => {
    return new Promise((resolve, reject) => {
      if (Array.isArray(id)) {
        Promise.all(id.map((v) => {
          return this.updateNote(v, {
            state: -1
          });
        })).then((res) => {
          resolve(res);
        }).catch((err) => {
          reject(err);
        });
      } else {
        if (!id) {
          reject('id is null');
          return;
        }

        this.updateNote(id, {
          state: -1
        }).then((res) => {
          resolve(res);
        }).catch((err) => {
          reject(err);
        });

      }
    });
  }

  _delectNote = (id) => {
    return new Promise((resolve, reject) => {
      if (Array.isArray(id)) {
        db.note.bulkDelete(id).then((res) => {
          this.dataUpdate();
          resolve(res);
        }).catch((err) => {
          console.error("delectNote", err);
          reject(err);
        });
      } else {
        if (!id) {
          reject('id is null');
          return;
        }
        db.note
          .delete(id)
          .then((res) => {
            this.dataUpdate();
            resolve(res);
          })
          .catch((err) => {
            console.error("delectNote", err);
            reject(err);
          });
      }
    });
  }

  init = async () => {
    if (!db.isOpen()) {
      await db.open();
    }
    chrome.storage.local.get(['contextMenusData'], (res) => {
      if (res.contextMenusData?.length > 0) {
        const notes = [];
        const cache_notes = {};

        res.contextMenusData.forEach(v => {
          const hashedString = MD5(v.pageUrl).toString();
          if (cache_notes[hashedString]) {
            if (v.type === 'text') {
              cache_notes[hashedString].content += `<p></p><p>${v.text}</p>`;
            } else {
              cache_notes[hashedString].content += `<img src="${v.imgUrl}">`;
            }
          } else {
            cache_notes[hashedString] = {
              fromUrl: v.pageUrl,
              title: v.title,
            }
            if (v.type === 'text') {
              cache_notes[hashedString].content = `<p>${v.text}</p>`;
            } else {
              cache_notes[hashedString].content = `<img src="${v.imgUrl}">`;
            }
          }
        });

        for (const key in cache_notes) {
          const v = _.cloneDeep(cache_notes[key]);
          v.content += `<p></p><p>来自：<a href="${v.fromUrl}">${v.title}</a></p>`;
          notes.push(v);
        }
        this.addNote(notes).then((res) => {
          chrome.storage.local.remove(['contextMenusData']);
        })
      }
    });
    this.clearNoteDustbin();
  }

  addSticky = ({
    top,
    left,
    id = 0
  }) => {
    const {
      homeNoteData
    } = this.rootStore.option.item;

    const canShowArrs = homeNoteData?.filter((v) => v.type != 'capsule');
    if (canShowArrs?.length >= 5) {
      this.rootStore.tools.error('最多只能有五个便签');
      return;
    }

    const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
    newData.push({
      key: getID(),
      id,
      top: top,
      left: left,
    })

    this.rootStore.option.setItem('homeNoteData', newData, false);
  }

  removeSticky = (key, isID = false) => {
    const {
      homeNoteData
    } = this.rootStore.option.item;

    const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
    newData.forEach((v, index) => {
      if (isID && v.id == key) {
        newData.splice(index, 1);
      } else if (v.key == key) {
        newData.splice(index, 1);
      }
    })

    this.rootStore.option.setItem('homeNoteData', newData, false);
  }

  setTimeCapsule = (key, timeType = "week") => {
    const {
      homeNoteData
    } = this.rootStore.option.item;

    const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
    let id = 0
    newData.forEach((v, index) => {
      if (v.key == key) {
        v.type = 'capsule';
        v.time = getRandomTimestamp(timeType);
        id = v.id;
      }
    })

    this.rootStore.option.setItem('homeNoteData', newData, false);

    this.findNote(id).then((res) => {
      if (res) {
        let html = res.content + `<p></p><p>-- ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>`;
        this.updateNote(id, {
          content: html
        })
      }
    })


    this.rootStore.tools.messageApi.success("已经把消息送往未来的你");
  }

  openTimeCapsule = (key) => {
    const {
      homeNoteData
    } = this.rootStore.option.item;

    const newData = homeNoteData?.length ? _.cloneDeep(homeNoteData) : [];
    newData.forEach((v, index) => {
      if (v.key == key) {
        v.type = '';
        v.time = 0;

      }
    })

    this.rootStore.option.setItem('homeNoteData', newData, false);
  }

  // 清空垃圾桶里 30 天前的便签
  clearNoteDustbin = () => {
    // 用Storage 控制 每天仅执行一次
    Storage.get('clearNoteDustbin').then((time) => {
      if (!time || dayjs().diff(time, 'day') > 1) {
        Storage.set('clearNoteDustbin', dayjs().format());
        this.getNote(1, 1000, -1).then((res) => {
          const notes = res.list;
          notes.forEach((v) => {
            if (v.updateTime && dayjs().diff(v.updateTime, 'day') > 30) {
              this._delectNote(v.id);
            }
          })
        })
      }
    })
  }

  addNewTab = () => {
    const noteTab = this.rootStore.option.getItem.noteTab;
    const addMinNoteTabNum = this.rootStore.option.getItem.addMinNoteTabNum;
    const newTab = _.cloneDeep(noteTab);
    newTab.push({
      key: `note_${addMinNoteTabNum}`,
      id: addMinNoteTabNum,
      title: '新便签页',
    })
    this.rootStore.option.setItem('noteTab', newTab, false);
    this.rootStore.option.setItem('addMinNoteTabNum', addMinNoteTabNum + 1, false);
  }

  getTopNoteTabId = () => {
    const noteTab = this.rootStore.option.getItem.noteTab;
    return noteTab[0].id || this.rootStore.option.getItem.addMinNoteTabNum - 1;
  }
}