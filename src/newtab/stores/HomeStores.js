import {
  observable,
  action,
  makeObservable,
} from "mobx";
import api from "~/utils/api";
import dayjs from 'dayjs'
import {
  base64ToBlob,
} from "~/utils";
import Storage from "~/utils/storage";

export default class HomeStores {
  bgUrl = "";
  bgThumbnailUrl = "";
  bg2Url = "";
  isBg2 = false;
  isLoadingWallpaper = false;
  isFirstLoad = false;
  bingLoadId = 0;
  bingDisplayedUrlbase = null;
  bingFullReady = false;
  rootStore;

  constructor(rootStore) {
    makeObservable(this, {
      bgUrl: observable,
      bgThumbnailUrl: observable,
      bg2Url: observable,
      isBg2: observable,
      isLoadingWallpaper: observable,
      isFirstLoad: observable,
      onLoadBg: action,
      randomBingBg: action,
      showBg1: action,
      showBg2: action,
    });
    this.rootStore = rootStore;
  }

  // ==================== Blob 存储工具方法 ====================
  
  /**
   * 用 fetch 获取远程图片的 Blob
   */
  async fetchImageBlob(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    return await response.blob();
  }

  /**
   * 创建缩略图 Blob（在 canvas 中缩放）
   */
  async createThumbnailBlob(imageUrl, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const width = img.width;
        const height = img.height;
        const scalingFactor = Math.min(maxWidth / width, maxHeight / height);
        
        canvas.width = width * scalingFactor;
        canvas.height = height * scalingFactor;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = imageUrl;
    });
  }

  // ==================== Bing 壁纸相关 ====================

  /**
   * 随机换一张 Bing 壁纸（最近 16 天内，且尽量不同于当前）
   */
  randomBingBg = () => {
    if (this.rootStore?.option?.item?.bgType !== 'bing') {
      return;
    }

    let loadingTimeout = null;
    let hideLoading = null;

    loadingTimeout = setTimeout(() => {
      if (this.rootStore?.tools?.messageApi) {
        hideLoading = this.rootStore.tools.messageApi.loading('正在加载壁纸...', 0);
      }
    }, 2000);

    const closeLoadingAndShowMessage = (type, message) => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      if (hideLoading) {
        hideLoading();
        hideLoading = null;
      }
      if (this.rootStore?.tools?.messageApi) {
        if (type === 'success') {
          this.rootStore.tools.messageApi.success(message);
        } else if (type === 'error') {
          this.rootStore.tools.messageApi.error(message);
        }
      }
    };

    const loadId = ++this.bingLoadId;
    Storage.get('bingImg').then(async (bingImgCache) => {
      const cache = this.convertOldCacheToNew(bingImgCache);
      const currentUrlbase = cache?.urlbase || null;

      try {
        const res = await api.get(
          `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=16&mkt=zh-CN`
        );
        if (loadId !== this.bingLoadId) {
          closeLoadingAndShowMessage();
          return;
        }

          if (res && Array.isArray(res.images) && res.images.length) {
          const list = res.images.map((img) => ({ urlbase: img.urlbase }));

            // 尽量排除当前正在使用的这张
          const filtered = currentUrlbase 
            ? list.filter((item) => item.urlbase !== currentUrlbase)
              : list;
            const finalList = filtered.length ? filtered : list;

            const randomIdx = Math.floor(Math.random() * finalList.length);
          const { urlbase } = finalList[randomIdx];
          
          this.downloadAndStoreBingBlob(urlbase, loadId).then(() => {
            if (loadId !== this.bingLoadId) {
              closeLoadingAndShowMessage();
              return;
            }
                closeLoadingAndShowMessage('success', '壁纸加载成功');
          }).catch(err => {
            console.error('后台存储 Bing 壁纸 Blob 失败：', err);
            if (loadId === this.bingLoadId) {
              closeLoadingAndShowMessage('error', '壁纸加载失败，请稍后重试');
            } else {
              closeLoadingAndShowMessage();
            }
          });
          } else {
            closeLoadingAndShowMessage('error', '获取壁纸列表失败，请稍后重试');
          }
      } catch (err) {
        console.error(err);
          closeLoadingAndShowMessage('error', '网络请求失败，请稍后重试');
      }
    }).catch((err) => {
      console.error('读取 Bing 背景缓存失败：', err);
      closeLoadingAndShowMessage('error', '读取缓存失败，请稍后重试');
    });
  };

  async prepareBingBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          if (typeof image.decode === 'function') {
            image.decode().then(resolve, reject);
          } else {
            resolve();
          }
        };
        image.onerror = () => reject(new Error('壁纸图片无法解码'));
        image.src = url;
      });
      return url;
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  /** 新图可显示后才切换；更新完成前保留旧缓存和旧画面。 */
  async downloadAndStoreBingBlob(urlbase, loadId = ++this.bingLoadId) {
    const srcUrl = `https://cn.bing.com${urlbase}_UHD.jpg`;
    const thumbnailUrl = `https://cn.bing.com${urlbase}_800x600.jpg`;

    try {
      const thumbBlob = await this.fetchImageBlob(thumbnailUrl).catch(() => null);
      if (thumbBlob) {
        const localThumbUrl = await this.prepareBingBlob(thumbBlob);
        if (loadId === this.bingLoadId) {
          this.bgThumbnailUrl = localThumbUrl;
          this.bgUrl = localThumbUrl;
          this.bingDisplayedUrlbase = urlbase;
          this.bingFullReady = false;
        } else {
          URL.revokeObjectURL(localThumbUrl);
          return;
        }
      }

      const srcBlob = await this.fetchImageBlob(srcUrl);
      const localSrcUrl = await this.prepareBingBlob(srcBlob);
      if (loadId !== this.bingLoadId) {
        URL.revokeObjectURL(localSrcUrl);
        return;
      }
      this.bgUrl = localSrcUrl;
      this.bingDisplayedUrlbase = urlbase;
      this.bingFullReady = true;
      this.isLoadingWallpaper = false;
      // 写入新缓存后才更换元数据指针，旧缓存始终可供其他标签读取。
      const oldMetadata = this.convertOldCacheToNew(await Storage.get('bingImg').catch(() => null));
      const blobKey = `bingWallpaper_${crypto.randomUUID()}`;
      await Storage.setBlob(blobKey, srcBlob);
      if (loadId !== this.bingLoadId) {
        await Storage.removeBlob(blobKey);
        return;
      }
      await Storage.replace('bingImg', { urlbase, time: dayjs().format(), blobKey });
      const oldBlobKey = oldMetadata?.blobKey || 'bingWallpaper';
      if (oldBlobKey !== blobKey) Storage.removeBlob(oldBlobKey).catch(console.error);
      Storage.removeBlob('bingWallpaperThumb').catch(console.error);
    } catch (err) {
      if (loadId === this.bingLoadId) this.isLoadingWallpaper = false;
      throw err;
    }
  }

  /**
   * 初始化加载背景
   */
  onLoadBg = () => {
    const bgLoadId = ++this.bingLoadId;
    this.rootStore.option.getOption('bgType').then((type) => {
      switch (type) {
        case 'bing':
          {
          const loadId = bgLoadId;
          this.getBingBg(loadId).then(({ srcUrl, thumbnailUrl, shouldUpdate, urlbase, fullReady }) => {
            if (loadId !== this.bingLoadId) return;
            if (srcUrl) {
              this.bgUrl = srcUrl;
              this.bingDisplayedUrlbase = urlbase;
              this.bingFullReady = fullReady;
            }
            if (thumbnailUrl) this.bgThumbnailUrl = thumbnailUrl;
            if (shouldUpdate) {
              this.isLoadingWallpaper = true;
              this.loadNewBingWallpaper(loadId).catch((err) => {
                console.error('后台更新 Bing 壁纸失败：', err);
                if (loadId === this.bingLoadId) this.isLoadingWallpaper = false;
              });
            }
          }).catch((err) => {
            console.error('加载 Bing 壁纸失败：', err);
            this.isLoadingWallpaper = false;
            this.isFirstLoad = false;
          });
          }
          break;
        case 'url':
          this.rootStore.option.getOption('bgUrl').then((value) => {
            this.bgUrl = value;
            this.bgThumbnailUrl = value;
          });
          break;
        case 'file':
          this.getLocalImageBlob('bgBase64').then((url) => {
            this.bgUrl = url;
            this.bgThumbnailUrl = url;
          }).catch((err) => {
            console.error('加载本地背景图失败：', err);
          });
          break;
        default:
          this.bgUrl = '';
          break;
      }
    });

    this.rootStore.option.getOption('bg2Type').then((type) => {
      switch (type) {
        case 'bing':
          this.getBingBg(this.bingLoadId).then(({ srcUrl }) => {
            this.bg2Url = srcUrl;
          });
          break;
        case 'url':
          this.rootStore.option.getOption('bg2Url').then((value) => {
            this.bg2Url = value;
          });
          break;
        case 'file':
          this.getLocalImageBlob('bg2Base64').then((url) => {
            this.bg2Url = url;
          }).catch((err) => {
            console.error('加载本地第二背景图失败：', err);
          });
          break;
      }
    });
  }

  showBg2 = () => {
    this.isBg2 = true;
  }

  showBg1 = () => {
    this.isBg2 = false;
  }

  /**
   * 将旧格式缓存转换为新格式
   */
  convertOldCacheToNew(oldCache) {
    if (!oldCache) return null;
    
    // 新格式：只有 urlbase 和 time
    if (oldCache.urlbase) {
      return oldCache;
    }
    
    // 旧格式：有 wallpapers 数组
    if (oldCache.wallpapers && Array.isArray(oldCache.wallpapers)) {
      const latest = oldCache.wallpapers[0];
      if (latest) {
        // 尝试从旧数据中提取 urlbase
        let urlbase = latest.urlbase;
        if (!urlbase && latest.originSrcUrl) {
          // 从 originSrcUrl 中提取 urlbase
          const match = latest.originSrcUrl.match(/\/th\?id=(.+?)_UHD\.jpg/);
          if (match) {
            urlbase = `/th?id=${match[1]}`;
          }
        }
        return {
          urlbase,
          time: latest.time || dayjs().format()
        };
      }
    }
    
    // 更旧的格式：单对象
    if (oldCache.time || oldCache.dataUrl || oldCache.srcUrl || oldCache.originSrcUrl) {
      let urlbase = oldCache.urlbase;
      if (!urlbase && oldCache.originSrcUrl) {
        const match = oldCache.originSrcUrl.match(/\/th\?id=(.+?)_UHD\.jpg/);
        if (match) {
          urlbase = `/th?id=${match[1]}`;
        }
      }
      return {
        urlbase,
        time: oldCache.time || dayjs().format()
      };
    }
    
    return null;
  }

  /**
   * 获取 Bing 壁纸
   * 优先使用本地缓存，后台更新时旧图继续显示。
   */
  async getBingBg(loadId = this.bingLoadId) {
        const metadata = await Storage.get('bingImg').catch(() => null);
        const cache = this.convertOldCacheToNew(metadata);
        // 1. 先尝试读取本地 Blob 缓存
        const [srcBlob, thumbBlob] = await Promise.all([
          Storage.getBlob(cache?.blobKey || 'bingWallpaper').catch(() => null),
          cache?.blobKey ? Promise.resolve(null) : Storage.getBlob('bingWallpaperThumb').catch(() => null)
        ]);

        // 有本地缓存
        if (srcBlob || thumbBlob) {
          // 先用缩略图（如果有），再用大图
          let thumbnailUrl = null;
          let srcUrl = null;
          if (srcBlob) {
            srcUrl = await this.prepareBingBlob(srcBlob).catch(() => null);
          }
          if (!srcUrl && thumbBlob) {
            thumbnailUrl = await this.prepareBingBlob(thumbBlob).catch(() => null);
            srcUrl = thumbnailUrl;
          }
          if (srcUrl) {
            this.isLoadingWallpaper = false;
            const isToday = cache?.time && dayjs(cache.time).isSame(dayjs(), 'day');
            return { srcUrl, thumbnailUrl: thumbnailUrl || srcUrl, shouldUpdate: !isToday, urlbase: cache?.urlbase, fullReady: Boolean(srcBlob && !thumbnailUrl) };
          }
        }
            
        // 2. 没有本地 Blob，检查是否有元数据（使用远程 URL）
        if (cache?.urlbase) {
          this.isLoadingWallpaper = true;
          await this.downloadAndStoreBingBlob(cache.urlbase, loadId);
          return { srcUrl: this.bgUrl, thumbnailUrl: this.bgThumbnailUrl };
        }
        
        // 3. 完全没有缓存，首次加载
        this.isFirstLoad = true;
        this.isLoadingWallpaper = true;
        
        const result = await this.loadNewBingWallpaper(loadId);
        return result;
  }

  /**
   * 加载新的 Bing 壁纸
   * 渐进式加载：先用缩略图显示，后台下载大图后自动替换
   */
  async loadNewBingWallpaper(loadId = this.bingLoadId) {
    try {
      const res = await api.get(
          `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`
      );

      if (res?.images?.[0]) {
        const { urlbase } = res.images[0];
        if (loadId !== this.bingLoadId) return { srcUrl: null, thumbnailUrl: null };
        const metadata = this.convertOldCacheToNew(await Storage.get('bingImg').catch(() => null));
        if (metadata?.urlbase === urlbase && this.bingDisplayedUrlbase === urlbase && this.bingFullReady) {
          await Storage.replace('bingImg', { ...metadata, time: dayjs().format() });
          this.isLoadingWallpaper = false;
          return { srcUrl: this.bgUrl, thumbnailUrl: this.bgThumbnailUrl };
        }
        await this.downloadAndStoreBingBlob(urlbase, loadId);
        this.isFirstLoad = false;
        return { srcUrl: this.bgUrl, thumbnailUrl: this.bgThumbnailUrl };
      } else {
        throw new Error('获取壁纸数据失败');
      }
    } catch (err) {
      console.error('加载新 Bing 壁纸失败：', err);
            this.isLoadingWallpaper = false;
            this.isFirstLoad = false;
      throw err;
    }
  }

  // ==================== 本地图片相关 ====================

  /**
   * 获取本地图片 Blob 并转为 URL
   * 兼容旧的 base64 格式，同时支持新的 Blob 格式
   */
  async getLocalImageBlob(optionKey) {
    const blobKey = `${optionKey}_blob`;
    
    // 1. 先尝试读取新格式的 Blob（最快）
    try {
      const blob = await Storage.getBlob(blobKey);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      // Blob 不存在，继续尝试旧格式
    }

    // 2. 读取 option 里的值
    const data = await this.rootStore.option.getOption(optionKey);
    
    // 如果是 __BLOB__ 标记但 Blob 读取失败，说明数据丢失
    if (data === '__BLOB__') {
      throw new Error('Blob data missing');
    }
    
    if (!data) {
      throw new Error('No local image data');
    }

    let blob;
    if (data instanceof Blob) {
      blob = data;
      // 迁移到新格式
      Storage.setBlob(blobKey, blob).then(() => {
        this.rootStore.option.setItem(optionKey, '__BLOB__');
      }).catch(err => {
        console.error('迁移本地图片到 Blob 格式失败：', err);
      });
    } else if (typeof data === 'string' && data.startsWith('data:')) {
      // 旧的 base64 格式，转换为 Blob 并迁移存储
      blob = base64ToBlob(data);
      
      // 迁移到新格式（后台执行）
      Storage.setBlob(blobKey, blob).then(() => {
        this.rootStore.option.setItem(optionKey, '__BLOB__');
      }).catch(err => {
        console.error('迁移本地图片到 Blob 格式失败：', err);
      });
    } else {
      throw new Error('Unknown local image format');
    }

    return URL.createObjectURL(blob);
  }

  /**
   * 保存本地图片为 Blob
   * 用于上传图片时调用
   */
  async saveLocalImageBlob(optionKey, file) {
    if (!(file instanceof Blob)) {
      throw new Error('Invalid file type');
    }

    const blobKey = `${optionKey}_blob`;
    await Storage.setBlob(blobKey, file);
    
    // 同时在 option 里保存一个标记，表示使用 Blob 存储
    await this.rootStore.option.setItem(optionKey, '__BLOB__');
    
    return URL.createObjectURL(file);
  }

  /**
   * 旧方法兼容（用于 file 类型背景）
   * @deprecated 请使用 getLocalImageBlob
   */
  getImgToCache = (type) => {
    return this.getLocalImageBlob(type);
  }
}
