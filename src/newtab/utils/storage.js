import {
  db
} from "~/db";

class Storage {
  constructor() {
    this.db = db;
  }

  async set(key, value) {
    // 先删除旧数据（使用正确的方式：通过 key 索引查找并删除）
    await this.remove(key);
    // 插入新数据
    return this.db.cache.put({
      key,
      ...value
    });
  }

  async get(key) {
    return (await this.db.cache.get({
      key
    }));
  }

  /**
   * 通过 key 字段删除记录（key 是唯一索引，不是主键）
   */
  async remove(key) {
    // 使用 where 查询删除，因为 key 是索引而非主键
    return this.db.cache.where('key').equals(key).delete();
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
    
    if (metadata) {
      // 删除所有的块（使用 where 查询删除）
      for (let i = 0; i < metadata.value.totalChunks; i++) {
        await this.db.cache.where('key').equals(`${key}_chunk_${i}`).delete();
      }
      // 删除元数据
      await this.db.cache.where('key').equals(metadataKey).delete();
    } else {
      // 即使没有 metadata，也尝试清理可能存在的孤立 chunk
      // 使用前缀匹配删除所有相关的 key
      await this.db.cache.where('key').startsWith(`${key}_chunk_`).delete();
      await this.db.cache.where('key').equals(metadataKey).delete();
    }
  }
}

export default new Storage();