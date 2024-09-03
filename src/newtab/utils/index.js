import _ from "lodash";
import {
  v4
} from 'uuid';
import dayjs from 'dayjs'

// 生成唯一ID
export const getID = () => {
  return v4();
};

// lodash 基于timeKey为主键对比 新旧内容差异以及排序，返回新增、删除、修改的数据
export const diff = (newList, oldList) => {
  const addList = [];
  const removeList = [];
  const updateList = [];
  const updateLogList = [];
  const oldListKey = _.keyBy(oldList, "timeKey");
  const newListKey = _.keyBy(newList, "timeKey");

  _.forEach(newListKey, (v, k) => {
    if (!oldListKey[k]) {
      addList.push(v);
    } else {
      const updateLog = [];
      if (oldListKey[k].title !== v.title) {
        updateLog.push("title");
      }
      if (oldListKey[k].sort !== v.sort) {
        updateLog.push("sort");
      }
      if (oldListKey[k].parentId !== v.parentId) {
        updateLog.push("parentId");
      }
      if (oldListKey[k].url !== v.url) {
        updateLog.push("url");
      }
      if (updateLog.length) {
        updateList.push(v);
        updateLogList.push({
          type: "update",
          linkId: v.timeKey,
          fields: updateLog,
        });
      }
    }
  });

  _.forEach(oldListKey, (v, k) => {
    if (!newListKey[k]) {
      removeList.push(v);
    }
  });

  return {
    addList,
    removeList,
    updateList,
    updateLogList,
  };
};

// 过滤链接信息，判断是否存在key并添加
export const filterLinkList = (list = [], parentId = 0, newKey = false) => {
  const newList = [];
  list.forEach((v, k) => {
    if (v.url !== "chrome://newtab/") {
      let item = v;
      if (!item.timeKey || newKey) {
        item = _.cloneDeep(v);
        item.timeKey = getID();
      }
      if (parentId) {
        item.parentId = parentId;
      }
      item.sort = k;
      newList.push(item);
    }
  });
  return newList;
};

export const writeText = (text = "") => {
  return new Promise((resolve, reject) => {
    try {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          resolve(true);
        })
        .catch((err) => {
          resolve(false);
        });
    } catch (err) {
      console.error("Failed to copy: ", err);
      resolve(false);
    }
  });
};


export function getRandomTimestamp(unit = 'week') {
  // return dayjs().add(5, 'second').valueOf();

  const units = ['week', 'month', 'half-year', 'year'];

  // 确保输入的单位有效
  if (!units.includes(unit)) {
    unit = 'week';
  }

  // 计算基础时间增量
  let baseIncrement;
  switch (unit) {
    case 'week':
      baseIncrement = 7;
      break;
    case 'month':
      baseIncrement = dayjs().daysInMonth();
      break;
    case 'half-year':
      baseIncrement = dayjs().daysInMonth() * 6;
      break;
    case 'year':
      baseIncrement = dayjs().dayOfYear(365).dayOfYear();
      break;
  }

  // 计算随机浮动值（最多为基础增量的 10%）
  const randomFloatingValue = baseIncrement * 0.1 * Math.random();

  // 确保周的增量至少为 7 天
  if (unit === '周') {
    baseIncrement += randomFloatingValue;
  } else {
    // 对于月、半年和年，增量可以是正的或负的
    baseIncrement += (Math.random() < 0.5 ? -1 : 1) * randomFloatingValue;
  }

  // 计算最终日期并返回时间戳
  const finalDate = dayjs().add(baseIncrement, 'day');
  return finalDate.valueOf(); // 返回时间戳
}

export function getBase64Image(url) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      let dataURL;
      try {
        dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
      canvas = null;
    };
    img.onerror = () => {
      reject(new Error(`Could not load image at ${url}`));
    };
    img.src = url;
  });
}

export function createThumbnail(src, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    var img = new Image();

    img.onload = function () {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');

      var width = img.width;
      var height = img.height;
      var scalingFactor = Math.min(maxWidth / width, maxHeight / height);

      canvas.width = width * scalingFactor;
      canvas.height = height * scalingFactor;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      var thumbnailBase64 = canvas.toDataURL('image/jpeg');
      resolve(thumbnailBase64);
    };

    img.onerror = function () {
      reject(new Error('无法加载图片'));
    };

    img.src = src;
  });
}

export function base64ToBlob(base64, mimeType) {
  // 解码Base64字符串
  var byteString = atob(base64.split(',')[1]);
  // 获取mime类型
  var mimeString = base64.split(',')[0].split(':')[1].split(';')[0];

  // 创建8位无符号整数数组，其大小等于Base64解码后的数据长度
  var ia = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    // 将字符转换为对应的ASCII码值
    ia[i] = byteString.charCodeAt(i);
  }

  // 使用Uint8Array创建Blob对象
  return new Blob([ia], {
    type: mimeType || mimeString
  });
}

export function formatSizeUnits(bytes) {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes > 1) {
    return bytes + ' 字符';
  } else if (bytes === 1) {
    return bytes + ' 字节';
  } else {
    return '0 字节';
  }
}

// 计算数据大小
export async function calculateDatabaseSize(db) {
  let totalSize = 0;
  // 遍历每个表
  for (const tableName of db.tables.map(table => table.name)) {
    const tableSize = await db.table(tableName).toArray()
      .then(rows => rows
        .map(row => JSON.stringify(row).length)
        .reduce((a, b) => a + b, 0)
      );
    totalSize += tableSize;
  }
  return totalSize;
}


export function downloadBlob(blob, filename) {
  // 为blob对象创建URL
  const blobUrl = URL.createObjectURL(blob);

  // 创建一个<a>元素
  const downloadLink = document.createElement('a');
  // 设置下载的文件名
  downloadLink.download = filename;
  // 设置href为blob的URL
  downloadLink.href = blobUrl;
  // 隐藏<a>元素
  downloadLink.style.display = 'none';

  // 将<a>元素添加到DOM中
  document.body.appendChild(downloadLink);
  // 触发点击事件
  downloadLink.click();

  // 清理
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(blobUrl);
}