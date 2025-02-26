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

db.version(1.5).stores({
  link: "++linkId,title,url,&timeKey,sort,parentId,hide",
  option: "++id,&key,value",
  note: "++id,content,createTime,updateTime,fromUrl,sort,state",
  cache: "++id,&key,value",
}).upgrade((transaction) => {
  return db.__upgrade(transaction)
});


// 更新旧数据
db.__upgrade = (db) => {
  const oldNoteTable = db.table('note');
  oldNoteTable.toCollection().modify((note) => {
    if (typeof note.state === 'undefined') {
      note.state = 1;
    }
  });
  return true;
}

// calculateDatabaseSize(db).then(size => {
//   console.log(`数据库大小大约为：${formatSizeUnits(size)}`);
// });

export const dbExport = () => {
  return db.export({
    prettyJson: true
  });
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
      const addList = pickData?.lenght ? data.map((v) => _.pick(v, field)) : data;
      db[dbName]
        .bulkPut(addList)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    } else {
      const add = pickData?.lenght ? _.pick(link, field) : data;
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
  const value = pickData?.lenght ? data.map((v) => _.pick(v, field)) : data;
  return db[dbName].update(id, value);
}