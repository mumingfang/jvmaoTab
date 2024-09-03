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

const field = ["id", "content", "fromUrl", "sort"];

export default class NoteStores {
  openEditor = false;
  openId = -1;

  constructor(rootStore) {
    makeObservable(this, {
      openEditor: observable,
      openId: observable,
      addNote: action,
      getNote: action,
      findNote: action,
      updateNote: action,
      open: action,
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
    this.openId = id;
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

  getNote = (page = 1, limit = 48, type = 'note') => {
    const {
      homeNoteData
    } = this.rootStore.option.item;
    const cIds = [];
    homeNoteData?.forEach((v) => {
      if (v.type == 'capsule') {
        cIds.push(v.id);
      }
    })
    return new Promise((resolve, reject) => {
      Promise.all([db.note.count(), db.note.orderBy('updateTime').reverse()
        .offset((page - 1) * limit)
        .limit(limit)
        .toArray().then((res) => {
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

  delectNote = (id) => {
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


}