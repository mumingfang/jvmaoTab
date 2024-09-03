import {
  db
} from "~/db";

class Storage {
  constructor() {
    this.db = db;
  }

  async set(key, value) {
    await this.remove(key);
    return db.cache
      .where("key")
      .equals(key)
      .toArray()
      .then((i) => {
        if (i.length > 0) {
          return db.cache.update(i[0].id, value);
        } else {
          return this.db.cache.put({
            key,
            ...value
          });
        }
      });
  }

  async get(key) {
    return (await this.db.cache.get({
      key
    }));
  }

  async remove(key) {
    return this.db.cache.delete(key);
  }

  async setBlob(key, blob, chunkSize = 1024 * 1024) {
    // 首先，删除可能存在的同key的旧数据
    await this.removeBlob(key);

    // 分块处理
    let chunkIndex = 0;
    let start = 0;
    while (start < blob.size) {
      let chunk = blob.slice(start, start + chunkSize);
      await this.db.cache.put({
        key: `${key}_chunk_${chunkIndex}`,
        value: chunk
      });
      start += chunkSize;
      chunkIndex++;
    }

    // 存储分块信息
    await this.db.cache.put({
      key: `${key}_metadata`,
      value: {
        totalChunks: chunkIndex
      }
    });
  }

  async getBlob(key) {
    // 首先获取分块信息
    const metadata = await this.db.cache.get({
      key: `${key}_metadata`
    });

    if (!metadata) {
      return null;
    }

    // 根据分块信息逐个读取块
    const chunks = [];
    for (let i = 0; i < metadata.value.totalChunks; i++) {
      const chunk = await this.db.cache.get({
        key: `${key}_chunk_${i}`
      });
      if (chunk) {
        chunks.push(chunk.value);
      } else {
        return null;
      }
    }

    // 合并所有块为一个Blob对象
    return new Blob(chunks);
  }

  async removeBlob(key) {
    // 首先获取分块信息
    const metadataKey = `${key}_metadata`;
    const metadata = await this.db.cache.get({
      key: metadataKey
    });
    console.log('%c [ metadata ]-98', 'font-size:13px; background:pink; color:#bf2c9f;', metadata)
    if (metadata) {
      // 删除所有的块
      for (let i = 0; i < metadata.value.totalChunks; i++) {
        await this.db.cache.delete(`${key}_chunk_${i}`);
      }
      // 删除元数据
      await this.db.cache.delete(metadataKey);
    }
  }
}

export default new Storage();