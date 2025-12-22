import Dexie from "dexie";
import {
  importDB,
  exportDB,
  importInto,
  peakImportFile,
} from "dexie-export-import";
import {
  calculateDatabaseSize,
  formatSizeUnits
} from "~/utils";

export const db = new Dexie("jvmao-tab");

// 说明：
// - favicon 表按域名（origin）存储站点图标，仅在链接真正被保存到抽屉时写入。
// - 字段：
//   - domain: 站点域名（new URL(url).origin），作为主键，避免重复存储同一站点的 favicon；
//   - iconUrl: 选中的 favicon 绝对地址或 dataURL（正常模式）；
//   - iconUrlDark: 暗黑模式的 favicon 绝对地址或 dataURL（可选）；
//   - size: 图标实际尺寸（如 naturalWidth，通常接近 128）；
//   - lastUpdate: 更新时间戳，后续若需要可做刷新策略。

// 保留 1.5 版本定义，确保旧数据能正确升级
db.version(1.5).stores({
  link: "++linkId,title,url,&timeKey,sort,parentId,hide",
  option: "++id,&key,value",
  note: "++id,content,createTime,updateTime,fromUrl,sort,state",
  cache: "++id,&key,value",
}).upgrade((transaction) => {
  return db.__upgrade(transaction);
});

// 版本 2：新增 favicon 表
db.version(2).stores({
  link: "++linkId,title,url,&timeKey,sort,parentId,hide",
  option: "++id,&key,value",
  note: "++id,content,createTime,updateTime,fromUrl,sort,state",
  cache: "++id,&key,value",
  favicon: "&domain,iconUrl,size,lastUpdate",
}).upgrade((transaction) => {
  // favicon 表为新表，无需迁移数据
  return Promise.resolve(true);
});

// 版本 3：favicon 表新增 iconUrlDark 字段（暗黑模式图标）
db.version(3).stores({
  link: "++linkId,title,url,&timeKey,sort,parentId,hide",
  option: "++id,&key,value",
  note: "++id,content,createTime,updateTime,fromUrl,sort,state",
  cache: "++id,&key,value",
  favicon: "&domain,iconUrl,iconUrlDark,size,lastUpdate",
}).upgrade((transaction) => {
  // 升级现有数据：为已有记录添加 iconUrlDark 字段（设为 null）
  const faviconTable = transaction.table("favicon");
  return faviconTable.toCollection().modify((favicon) => {
    if (typeof favicon.iconUrlDark === "undefined") {
      favicon.iconUrlDark = null;
    }
  });
});


// 更新旧数据
db.__upgrade = (t) => {
  const oldNoteTable = t.table("note");
  oldNoteTable.toCollection().modify((note) => {
    if (typeof note.state === "undefined") {
      note.state = 1;
    }
  });
  // favicon 为新表，无需迁移旧数据，确保升级过程不抛异常即可。
  return true;
};

// calculateDatabaseSize(db).then(size => {
//   console.log(`数据库大小大约为：${formatSizeUnits(size)}`);
// });

export const dbExport = () => {
  return db.export({
    prettyJson: true
  });
};

// favicon 工具函数
export const getFavicon = async (domain) => {
  if (!domain) return Promise.resolve(undefined);
  try {
    // 确保数据库已打开
    if (!db.isOpen()) {
      await db.open();
    }
    return await db.favicon.get(domain);
  } catch (e) {
    console.error("[favicon] getFavicon error", e);
    return undefined;
  }
};

export const saveFavicon = async ({ domain, iconUrl, iconUrlDark = null, size }) => {
  if (!domain || !iconUrl) {
    console.warn("[favicon] saveFavicon: missing domain or iconUrl", { domain, iconUrl });
    return Promise.resolve(undefined);
  }
  try {
    // 确保数据库已打开
    if (!db.isOpen()) {
      await db.open();
    }
    
    // 不存储 chrome-extension:// 这种扩展内部 API URL
    // Chrome 的 _favicon API 只在显示时动态生成，不存储到数据库
    let finalIconUrlDark = iconUrlDark;
    if (finalIconUrlDark && typeof finalIconUrlDark === "string" && finalIconUrlDark.startsWith("chrome-extension://")) {
      console.warn("[favicon] saveFavicon: rejecting chrome-extension:// URL for iconUrlDark", finalIconUrlDark);
      finalIconUrlDark = null;
    }
    
    const result = await db.favicon.put({
      domain,
      iconUrl,
      iconUrlDark: finalIconUrlDark || null,
      size: size || null,
      lastUpdate: Date.now(),
    });
    console.log("[favicon] saveFavicon: saved", domain, iconUrl, finalIconUrlDark, result);
    return result;
  } catch (e) {
    console.error("[favicon] saveFavicon error", e, { domain, iconUrl, iconUrlDark, size });
    throw e;
  }
};


const find = (dbName, id) => {
  return new Promise((resolve, reject) => {
    db[dbName]
      .get(id)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

const add = (dbName, data, pickData = []) => {
  return new Promise((resolve, reject) => {
    if (Array.isArray(data)) {
      const addList = pickData?.length ? data.map((v) => _.pick(v, field)) : data;
      db[dbName]
        .bulkPut(addList)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    } else {
      const add = pickData?.length ? _.pick(link, field) : data;
      db[dbName]
        .put(add)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
}

const update = (dbName, id, data, pickData = []) => {
  const value = pickData?.length ? data.map((v) => _.pick(v, field)) : data;
  return db[dbName].update(id, value);
}