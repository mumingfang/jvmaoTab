import { db } from "~/db";
import { handleError } from "~/utils/errorHandler";

/**
 * 统一的 Dexie 操作封装
 * 只做「确保数据库打开 + 错误日志」，不改变调用方的业务逻辑分支
 */
export const dbOperations = {
  async ensureOpen() {
    if (!db.isOpen()) {
      await db.open();
    }
  },

  async safeGet(table, key, context = "") {
    try {
      await this.ensureOpen();
      return await db[table].get(key);
    } catch (error) {
      handleError(error, context || `dbOperations.safeGet.${table}`);
      throw error;
    }
  },

  async safePut(table, value, context = "") {
    try {
      await this.ensureOpen();
      return await db[table].put(value);
    } catch (error) {
      handleError(error, context || `dbOperations.safePut.${table}`);
      throw error;
    }
  },

  async safeBulkPut(table, values, context = "") {
    try {
      await this.ensureOpen();
      return await db[table].bulkPut(values);
    } catch (error) {
      handleError(error, context || `dbOperations.safeBulkPut.${table}`);
      throw error;
    }
  },
};


