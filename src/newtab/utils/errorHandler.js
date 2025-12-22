export class AppError extends Error {
  constructor(message, code, context) {
    super(message);
    this.code = code;
    this.context = context;
    this.name = "AppError";
  }
}

/**
 * 统一错误处理
 * 只负责日志和少量全局兜底行为，不改变调用方的业务分支
 */
export const handleError = (error, context = "") => {
  if (!error) {
    return;
  }

  // 数据库已关闭的情况，页面通常已经不可用，直接刷新
  if (error.name === "DatabaseClosedError") {
    console.error("[DatabaseClosedError]", context, error);
    // 避免死循环，这里只做一次性刷新
    window.location.reload();
    return;
  }

  console.error(`[Error][${context}]`, error);
};

/**
 * 包一层安全调用，仅用于非关键路径
 * 不抛出异常，而是返回 fallback
 */
export const safeAsync = async (fn, context = "", fallback = null) => {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
};


