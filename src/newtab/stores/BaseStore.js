import { db } from "~/db";
import { handleError } from "~/utils/errorHandler";

export default class BaseStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  /**
   * 对数据库操作做一层统一封装：
   * - 确保 db 已打开
   * - 统一错误处理
   * - 不改变返回值与调用方式
   */
  async safeDbOperation(operation, context = "") {
    try {
      if (!db.isOpen()) {
        await db.open();
      }
      return await operation();
    } catch (error) {
      handleError(error, context || "BaseStore.safeDbOperation");
      throw error;
    }
  }
}


