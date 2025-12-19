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
import { ensureFaviconForUrl } from "~/utils/favicon";
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
        // 如果没有 linkId，先查询获取
        return db.link
          .where("timeKey")
          .equals(v.timeKey)
          .first()
          .then((linkData) => {
            if (linkData && linkData.linkId) {
              return db.link.update(linkData.linkId, _.pick(v, field));
            } else {
              console.warn("updateLink: link not found for timeKey", v.timeKey);
              return Promise.resolve();
            }
          })
          .catch((err) => {
            console.error("updateLink: error fetching linkId", err);
            return Promise.resolve();
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
                  title: "分组（右击标题可以添加至首屏）",
                  parentId: timeKey,
                  timeKey: timeKeyPanel,
                },
                {
                  title: "摸鱼爱好者导航",
                  url: "https://n.mumingfang.com/my",
                  parentId: timeKeyPanel,
                  timeKey: getID(),
                },
                {
                  title: "点击可进行访问",
                  url: "https://n.mumingfang.com/my",
                  parentId: timeKeyPanel,
                  timeKey: getID(),
                },
                {
                  title: "右击可以删除",
                  url: "https://n.mumingfang.com/my",
                  parentId: timeKeyPanel,
                  timeKey: getID(),
                },
              ]; 
              this.addLink(links).then(() => {
                this.getNav();
                // 自动为默认链接获取图标（由于所有默认链接都是同一个 URL，只需要获取一次）
                const defaultUrl = "https://n.mumingfang.com/my";
                ensureFaviconForUrl(defaultUrl).catch((err) => {
                  console.debug("[favicon] Failed to fetch favicon for default link", defaultUrl, err);
                });
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

  // 获取待添加网址列表（parentId 为 "000000"）
  getPendingLinks() {
    return new Promise((resolve, reject) => {
      db.link
        .where("parentId")
        .equals("000000")
        .toArray()
        .then((res) => {
          resolve(res || []);
        })
        .catch((err) => {
          console.error("getPendingLinks", err);
          reject(err);
        });
    });
  }

  // 添加待添加网址
  addPendingLink(url, title) {
    return new Promise((resolve, reject) => {
      // 检查是否已存在相同的 URL
      db.link
        .where("parentId")
        .equals("000000")
        .and((link) => link.url === url)
        .first()
        .then((existing) => {
          if (existing) {
            // 如果已存在，直接返回
            resolve(existing);
            return;
          }
          // 获取当前待添加网址的数量，用于设置 sort
          this.getPendingLinks().then((pendingLinks) => {
            const newLink = {
              title: title || url,
              url: url,
              parentId: "000000",
              sort: pendingLinks.length,
              timeKey: getID(),
              hide: false,
            };
            db.link
              .put(newLink)
              .then((res) => {
                this.rootStore.data.update();
                resolve(res);
              })
              .catch((err) => {
                console.error("addPendingLink", err);
                reject(err);
              });
          });
        })
        .catch((err) => {
          console.error("addPendingLink check", err);
          reject(err);
        });
    });
  }

  // 删除待添加网址
  removePendingLink(timeKey) {
    return new Promise((resolve, reject) => {
      db.link
        .where("timeKey")
        .equals(timeKey)
        .and((link) => link.parentId === "000000")
        .delete()
        .then((res) => {
          this.rootStore.data.update();
          resolve(res);
        })
        .catch((err) => {
          console.error("removePendingLink", err);
          reject(err);
        });
    });
  }

  // 将待添加网址添加到指定分组
  addPendingLinksToGroup(timeKey, parentId) {
    return new Promise((resolve, reject) => {
      db.link
        .where("timeKey")
        .equals(timeKey)
        .and((link) => link.parentId === "000000")
        .first()
        .then((link) => {
          if (!link) {
            reject(new Error("Link not found"));
            return;
          }
          // 获取目标分组的链接数量，用于设置 sort
          this.getLinkByParentId([parentId]).then((links) => {
            const updatedLink = {
              ...link,
              parentId: parentId,
              sort: links.length,
            };
            db.link
              .update(link.linkId, updatedLink)
              .then((res) => {
                this.rootStore.data.update();
                resolve(res);
              })
              .catch((err) => {
                console.error("addPendingLinksToGroup", err);
                reject(err);
              });
          });
        })
        .catch((err) => {
          console.error("addPendingLinksToGroup", err);
          reject(err);
        });
    });
  }

}