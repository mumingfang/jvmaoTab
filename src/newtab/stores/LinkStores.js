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
import {
  getID,
  diff
} from "~/utils";
import _ from "lodash";

export default class LinkStore {
  isInit = false;
  list = [];
  cacheList = [];
  linkNav = [];
  _solist = [];
  activeId = null;
  addPanelToLinkItemEmitter = null;
  rootStore;

  constructor(rootStore) {
    makeObservable(this, {
      isInit: observable,
      list: observable,
      cacheList: observable,
      linkNav: observable,
      activeId: observable,
      addPanelToLinkItemEmitter: observable,
      setActiveId: action,
      setLink: action,
      setCache: action,
      updateNav: action,
      getLinkByTimeKey: action,
      getActiveID: computed,
      titleLink: computed,
    });
    // autorun(() => {
    //   console.log("[ autorun. ] >", this.list);
    // });
    this.rootStore = rootStore;
  }

  updateNav() {
    return new Promise((resolve, reject) => {
      this.rootStore.option.getHomeId().then((homeId) => {
        this.getLinkByParentId([homeId], this.rootStore.option.showHide).then(
          (res) => {
            this.linkNav = res.sort((a, b) => {
              return a.sort - b.sort;
            });
            resolve(this.linkNav);
          }
        );
      });
    }).catch((err) => {
      reject(err);
    })
  }

  async getNav(refresh = false) {
    const res = await this.updateNav();
    if (res.length === 0) {
      return;
    }
    if (refresh && this.activeId) {
      this.setActiveId(this.activeId, true);
    } else {
      this.setActiveId(res[0].timeKey);
    }
  }

  setActiveId(id, refresh = false) {
    if (refresh || this.activeId !== id) {
      this.activeId = id;
      const newList = [];
      this.getLinkByParentId([id]).then((res) => {
        newList.push(...res);
        this.getLinkByParentId(res.map((v) => v.timeKey)).then((res) => {
          newList.push(...res);
          this.setLink(newList);
        }).finally(() => {
          this.isInit = true;
        })
      });
    }
  }

  get getActiveID() {
    return this.activeId;
  }

  get titleLink() {
    if (this.list.length !== 0) {
      return this.linkForId(this.getActiveID);
    }
    return [];
  }

  linkForId(id) {
    return this.list
      .filter((v) => v.parentId === id)
      .sort((a, b) => {
        return a.sort - b.sort;
      });
  }

  setCache() {
    this.cacheList = _.cloneDeep(this.list);
  }

  setLink(link) {
    this.list = link;
    setTimeout(() => {
      this.setCache();
    }, 0);
  }

  addLink(link) {
    const field = ["title", "url", "parentId", "sort", "timeKey", "hide"];
    return new Promise((resolve, reject) => {
      if (Array.isArray(link)) {
        const addList = link.map((v) => _.pick(v, field));
        db.link
          .bulkPut(addList)
          .then((res) => {
            this.rootStore.data.update();
            resolve(res);
          })
          .catch((err) => {
            console.log("addLink", err);
            reject(err);
          });
      } else {
        const add = _.pick(link, field);
        db.link
          .put(add)
          .then((res) => {
            this.rootStore.data.update();
            resolve(res);
          })
          .catch((err) => {
            console.error("addLink", err);
            reject(err);
          });
      }
    });
  }

  updateLink(links) {
    const field = ["title", "url", "parentId", "sort"];
    const update = links.map((v) => {
      if (!v.linkId) {
        db.link
          .where("timeKey")
          .equals(v.timeKey)
          .toArray()
          .then((i) => {
            if (i.length > 0) {
              v.linkId = i[0].linkId;
              return db.link.update(v.linkId, _.pick(v, field));
            }
          });
      } else {
        return db.link.update(v.linkId, _.pick(v, field));
      }
    });
    return Promise.all(update)
      .then((res) => {
        this.rootStore.data.update();
        return res;
      })
      .catch((err) => {
        console.error("updateLink", err);
      });
  }

  deleteLinkByTimeKey(timeKeys) {
    return new Promise((resolve, reject) => {
      db.link
        .where("timeKey")
        .anyOf(timeKeys)
        .delete()
        .then((res) => {
          this.rootStore.data.update();
          resolve(res);
        })
        .catch((err) => {
          reject(err);
          console.error("deleteLink", err);
        });
    });
  }

  getLinkByParentId(parentIds, hide = false) {
    if (hide) {
      return db.link.where("parentId").anyOf(parentIds).toArray();
    } else {
      return db.link.where("parentId").anyOf(parentIds).and(function (link) {
        return !link.hide;
      }).toArray();
    }
  }

  updateData(newValue) {
    const {
      addList,
      removeList,
      updateList
    } = diff(newValue, this.cacheList);

    if (addList.length > 0) {
      this.addLink(addList);
    }
    if (updateList.length > 0) {
      this.updateLink(updateList);
    }
    if (removeList.length > 0) {
      this.deleteLinkByTimeKey(removeList.map((v) => v.timeKey));
    }

    setTimeout(() => {
      this.getAllLinkToSo();
    }, 500);
  }



  // 修改缓存数据
  updateCacheLinkByTimeKey(timeKey, title, url = "") {
    const index = this.list.findIndex((v) => v.timeKey === timeKey);
    if (index !== -1) {
      const link = _.cloneDeep(this.list[index]);
      link.title = title;
      if (url) {
        link.url = url;
      }
      this.list.splice(index, 1, link);
    }
  }

  // 查询所有链接
  getAllLinkToSo() {
    this.rootStore.option.getHomeId().then((homeId) => {
      db.link.where("parentId").notEqual(homeId).and(function (link) {
        return !link.hide;
      }).toArray().then((links) => {
        if (!links) {
          return;
        }
        this._solist = _.filter(links, v => {
          return v.url;
        });
      })
    });
  }

  // 模糊搜索
  searchLink(searchTerm) {
    return new Promise((resolve, reject) => {
      const links = _.filter(this._solist, v => {
        // 创建一个正则表达式对象，进行模糊匹配
        const regex = new RegExp(_.escapeRegExp(searchTerm), 'i');
        return regex.test(v.title);
      });
      resolve(links);
    });
  }


  init() {
    this.rootStore.option.getHomeId().then((homeId) => {
      if (!homeId) {
        console.error("未获取到homeId");
        return;
      }
      db.link
        .count()
        .then((res) => {
          if (!res) {
            this.rootStore.note._init();
            setTimeout(() => {
              const timeKey = getID();
              const timeKeyPanel = getID();
              const links = [{
                  title: "左抽屉",
                  timeKey,
                  parentId: homeId,
                },
                {
                  title: "右抽屉",
                  timeKey: getID(),
                  parentId: homeId,
                },
                {
                  title: "暗格",
                  timeKey: getID(),
                  parentId: homeId,
                  hide: true,
                },
                {
                  title: "分组（右击可以将此分组添加至首屏）",
                  parentId: timeKey,
                  timeKey: timeKeyPanel,
                },
                {
                  title: "霂明坊",
                  url: "https://mumingfang.com/group-11-1.html",
                  parentId: timeKeyPanel,
                  timeKey: getID(),
                },
                {
                  title: "点击可进行访问",
                  url: "https://mumingfang.com/group-11-1.html",
                  parentId: timeKeyPanel,
                  timeKey: getID(),
                },
                {
                  title: "右击可以删除",
                  url: "https://mumingfang.com/group-11-1.html",
                  parentId: timeKeyPanel,
                  timeKey: getID(),
                },
              ];
              this.addLink(links).then(() => {
                this.getNav();
              })
            }, 0);
          } else {
            this.getNav();
          }
          this.getAllLinkToSo();
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  getLinkByTimeKey(timeKey) {
    return new Promise((resolve, reject) => {
      db.link
        .where("timeKey")
        .equals(timeKey)
        .first()
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
          console.error("getLinkByTimeKey", err);
        });
    });
  }

  async restart() {
    if (!db.isOpen()) {
      await db.open();
    }
    if (this.isInit) {
      this.getNav(true);
    } else {
      this.init();
    }
    this.rootStore.option.init();
  }

}