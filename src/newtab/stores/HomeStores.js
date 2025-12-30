import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import api from "~/utils/api";
import dayjs from 'dayjs'
import {
  createThumbnail,
  base64ToBlob,
  getBase64Image
} from "~/utils";
import Storage from "~/utils/storage";

export default class HomeStores {
  bgUrl = "";
  bgThumbnailUrl = "";
  bg2Url = "";
  isBg2 = false;
  isLoadingWallpaper = false;
  isFirstLoad = false;
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

  // 随机换一张 Bing 壁纸（最近 16 天内，且尽量不同于当前）
  randomBingBg = () => {
    // 仅当当前背景类型为 bing 时才生效
    if (this.rootStore?.option?.item?.bgType !== 'bing') {
      return;
    }

    let loadingTimeout = null;
    let hideLoading = null;

    // 2秒后显示loading通知
    loadingTimeout = setTimeout(() => {
      if (this.rootStore?.tools?.messageApi) {
        hideLoading = this.rootStore.tools.messageApi.loading('正在加载壁纸...', 0);
      }
    }, 2000);

    // 关闭loading并显示消息的辅助函数
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

    // 先获取当前缓存的 originSrcUrl，用于排除当前壁纸
    Storage.get('bingImg').then((bingImgCache) => {
      const cache = this.convertOldCacheToNew(bingImgCache);
      const wallpapers = cache?.wallpapers || [];
      // 获取当前使用的壁纸的 originSrcUrl
      const currentWallpaper = wallpapers.find(wp => {
        if (!wp.time) return false;
        return dayjs(wp.time).isSame(dayjs(), 'day');
      }) || (wallpapers.length > 0 ? wallpapers[0] : null);
      const currentOriginUrl = currentWallpaper?.originSrcUrl || null;

      // 一次性取最近 16 天的壁纸，然后随机挑一张（排除当前这张）
      api
        .get(
          `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=16&mkt=zh-CN`
        )
        .then(async (res) => {
          if (res && Array.isArray(res.images) && res.images.length) {
            const list = res.images.map((img) => {
              const { urlbase } = img;
              // src 用 UHD 超清，thumbnail 用 800x600 作为占位
              const originSrcUrl = `https://cn.bing.com${urlbase}_UHD.jpg`;
              const thumbnailUrl = `https://cn.bing.com${urlbase}_800x600.jpg`;
              return { originSrcUrl, thumbnailUrl, urlbase };
            });

            // 尽量排除当前正在使用的这张
            const filtered = currentOriginUrl 
              ? list.filter((item) => item.originSrcUrl !== currentOriginUrl)
              : list;
            const finalList = filtered.length ? filtered : list;

            const randomIdx = Math.floor(Math.random() * finalList.length);
            const { originSrcUrl, thumbnailUrl } = finalList[randomIdx];

            try {
              // 将新选中的 UHD 图片转为 base64，并存储，确保新标签页也能用
              const dataUrl = await getBase64Image(originSrcUrl);
              let thumbnailDataUrl = null;

              try {
                thumbnailDataUrl = await createThumbnail(originSrcUrl, 800, 600);
              } catch (thumbErr) {
                console.error('生成 Bing 背景缩略图失败：', thumbErr);
              }

              const blob = base64ToBlob(dataUrl);
              const localSrcUrl = URL.createObjectURL(blob);

              let localThumbnailUrl = localSrcUrl;
              if (thumbnailDataUrl) {
                const thumbBlob = base64ToBlob(thumbnailDataUrl);
                localThumbnailUrl = URL.createObjectURL(thumbBlob);
              }

              // 更新显示
              this.bgUrl = localSrcUrl;
              this.bgThumbnailUrl = localThumbnailUrl;

              // 存储到本地，使用新格式
              const newWallpaper = {
                dataUrl,
                thumbnailDataUrl,
                originSrcUrl,
                time: dayjs().format()
              };
              
              // 检查是否已存在当天的壁纸
              const today = dayjs();
              const todayIndex = wallpapers.findIndex(wp => 
                wp.time && dayjs(wp.time).isSame(today, 'day')
              );
              
              if (todayIndex >= 0) {
                wallpapers[todayIndex] = newWallpaper;
              } else {
                wallpapers.unshift(newWallpaper);
              }
              
              // 清理旧壁纸
              const cleanedWallpapers = this.cleanOldWallpapers(wallpapers);
              
              Storage.set('bingImg', {
                wallpapers: cleanedWallpapers,
                lastUpdateTime: dayjs().format()
              });

              // 图片加载成功，延迟500ms后关闭loading并显示成功消息
              setTimeout(() => {
                closeLoadingAndShowMessage('success', '壁纸加载成功');
              }, 500);
            } catch (e) {
              console.error('随机 Bing 背景 base64 转换失败，回退到直接使用远程地址：', e);
              // 失败时直接使用远程地址，但不存储（避免覆盖已有缓存）
              try {
                this.bgUrl = originSrcUrl;
                this.bgThumbnailUrl = thumbnailUrl;
                // 即使回退到远程地址，也算加载成功
                setTimeout(() => {
                  closeLoadingAndShowMessage('success', '壁纸加载成功');
                }, 500);
              } catch (fallbackErr) {
                // 如果远程地址也失败，显示错误
                closeLoadingAndShowMessage('error', '壁纸加载失败，请稍后重试');
              }
            }
          } else {
            closeLoadingAndShowMessage('error', '获取壁纸列表失败，请稍后重试');
          }
        })
        .catch((err) => {
          console.log(err);
          closeLoadingAndShowMessage('error', '网络请求失败，请稍后重试');
        });
    }).catch((err) => {
      console.error('读取 Bing 背景缓存失败：', err);
      closeLoadingAndShowMessage('error', '读取缓存失败，请稍后重试');
    });
  };

  // 初始化
  onLoadBg = () => {
    this.rootStore.option.getOption('bgType').then((type) => {
      switch (type) {
        case 'bing':
          this.getBingBg().then(({
            srcUrl,
            thumbnailUrl
          }) => {
            this.bgUrl = srcUrl;
            this.bgThumbnailUrl = thumbnailUrl;
          }).catch((err) => {
            console.error('加载 Bing 壁纸失败：', err);
            this.isLoadingWallpaper = false;
            this.isFirstLoad = false;
            // 加载失败时，尝试使用缓存的旧壁纸
            Storage.get('bingImg').then((cache) => {
              const convertedCache = this.convertOldCacheToNew(cache);
              const wallpapers = convertedCache?.wallpapers || [];
              if (wallpapers.length > 0) {
                const found = this.findWallpaper(wallpapers);
                if (found && found.wallpaper) {
                  const urlResult = this.createUrlFromWallpaper(found.wallpaper);
                  if (urlResult) {
                    this.bgUrl = urlResult.srcUrl;
                    this.bgThumbnailUrl = urlResult.thumbnailUrl;
                  }
                }
              }
            });
          });
          break;
        case 'url':
          this.rootStore.option.getOption('bgUrl').then((value) => {
            this.bgUrl = value
            this.bgThumbnailUrl = value
          });
          break;
        case 'file':
          this.getImgToCache('bgBase64').then((url) => {
            this.bgUrl = url;
            // this.bgThumbnailUrl = thumbnail;
          });
          break;
        default:
          this.bgUrl = '';
          break;
      }
    })

    this.rootStore.option.getOption('bg2Type').then((type) => {
      switch (type) {
        case 'bing':
          this.getBingBg().then(({
            srcUrl
          }) => {
            this.bg2Url = srcUrl;
          });
          break;
        case 'url':
          this.rootStore.option.getOption('bg2Url').then((value) => {
            this.bg2Url = value;
          });
          break;
        case 'file':
          this.getImgToCache('bg2Base64').then((url) => {
            // var url = URL.createObjectURL(blob)
            this.bg2Url = url
            // this.bg1Url = url
          });
          break;
      }
    })

  }

  showBg2 = () => {
    this.isBg2 = true;
    // if (this.bg2Url) {
    //   this.bgUrl = this.bg2Url;
    // }
  }

  showBg1 = () => {
    this.isBg2 = false;
    // if (this.rootStore.option.item?.bgType === 'color') {
    //   this.bgUrl = "";
    // } else if (this.bgUrl !== this.bg1Url) {
    //   this.bgUrl = this.bg1Url;
    // }
  }


  // 将旧格式缓存转换为新格式
  convertOldCacheToNew(oldCache) {
    if (!oldCache) return null;
    
    // 检查是否已经是新格式（有 wallpapers 数组）
    if (oldCache.wallpapers && Array.isArray(oldCache.wallpapers)) {
      return oldCache;
    }
    
    // 旧格式：单对象，转换为新格式
    if (oldCache.time || oldCache.dataUrl || oldCache.srcUrl) {
      return {
        wallpapers: [{
          dataUrl: oldCache.dataUrl,
          thumbnailDataUrl: oldCache.thumbnailDataUrl,
          originSrcUrl: oldCache.originSrcUrl,
          time: oldCache.time || dayjs().format(),
          srcUrl: oldCache.srcUrl,
          thumbnailUrl: oldCache.thumbnailUrl
        }],
        lastUpdateTime: oldCache.time || dayjs().format()
      };
    }
    
    return null;
  }

  // 从壁纸对象创建 URL
  createUrlFromWallpaper(wallpaper) {
    if (!wallpaper) return null;
    
    try {
      if (wallpaper.dataUrl) {
        const blob = base64ToBlob(wallpaper.dataUrl);
        const localSrcUrl = URL.createObjectURL(blob);
        let localThumbnailUrl = localSrcUrl;
        
        if (wallpaper.thumbnailDataUrl) {
          const thumbBlob = base64ToBlob(wallpaper.thumbnailDataUrl);
          localThumbnailUrl = URL.createObjectURL(thumbBlob);
        }
        
        return {
          srcUrl: localSrcUrl,
          thumbnailUrl: localThumbnailUrl
        };
      } else if (wallpaper.srcUrl) {
        // 兼容老数据结构：只有远程地址，没有 base64
        return {
          srcUrl: wallpaper.srcUrl,
          thumbnailUrl: wallpaper.thumbnailUrl || wallpaper.srcUrl
        };
      }
    } catch (e) {
      console.error('解析本地 Bing 背景缓存失败：', e);
    }
    
    return null;
  }

  // 查找壁纸：优先当天，否则找最近的（近15天内）
  findWallpaper(wallpapers) {
    if (!wallpapers || !Array.isArray(wallpapers) || wallpapers.length === 0) {
      return null;
    }
    
    const today = dayjs();
    
    // 先找当天的
    const todayWallpaper = wallpapers.find(wp => {
      if (!wp.time) return false;
      return dayjs(wp.time).isSame(today, 'day');
    });
    
    if (todayWallpaper) {
      return { wallpaper: todayWallpaper, isToday: true };
    }
    
    // 没找到当天的，找最近的（按日期倒序）
    const sortedWallpapers = wallpapers
      .filter(wp => wp.time) // 过滤掉没有时间的
      .sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf()); // 按日期倒序
    
    if (sortedWallpapers.length > 0) {
      const recentWallpaper = sortedWallpapers[0];
      const daysDiff = today.diff(dayjs(recentWallpaper.time), 'day');
      
      // 只返回15天内的，但如果没有其他选择，至少返回一个
      if (daysDiff <= 15 || sortedWallpapers.length === 1) {
        return { wallpaper: recentWallpaper, isToday: false };
      }
    }
    
    // 如果都没有，返回第一个（至少保证有壁纸）
    if (wallpapers.length > 0) {
      return { wallpaper: wallpapers[0], isToday: false };
    }
    
    return null;
  }

  // 清理超过15天的旧壁纸，但至少保留1份
  cleanOldWallpapers(wallpapers) {
    if (!wallpapers || !Array.isArray(wallpapers)) {
      return [];
    }
    
    if (wallpapers.length <= 1) {
      return wallpapers; // 至少保留1份
    }
    
    const today = dayjs();
    const validWallpapers = wallpapers.filter(wp => {
      if (!wp.time) return true; // 没有时间的保留
      const daysDiff = today.diff(dayjs(wp.time), 'day');
      return daysDiff <= 15;
    });
    
    // 如果清理后没有壁纸了，至少保留1份（最新的）
    if (validWallpapers.length === 0 && wallpapers.length > 0) {
      const sorted = wallpapers
        .filter(wp => wp.time)
        .sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf());
      return sorted.length > 0 ? [sorted[0]] : [wallpapers[0]];
    }
    
    return validWallpapers.length > 0 ? validWallpapers : [wallpapers[0]];
  }

  getBingBg() {
    return new Promise((resolve, reject) => {
      Storage.get('bingImg').then((bingImgCache) => {
        // 转换旧格式到新格式
        const cache = this.convertOldCacheToNew(bingImgCache);
        let wallpapers = cache?.wallpapers || [];
        
        // 查找可用的壁纸
        const found = this.findWallpaper(wallpapers);
        
        // 如果有缓存的壁纸，立即返回使用（保证壁纸始终可见）
        if (found && found.wallpaper) {
          const urlResult = this.createUrlFromWallpaper(found.wallpaper);
          if (urlResult) {
            // 如果使用的是当天壁纸，不需要加载新壁纸
            if (found.isToday) {
              this.isLoadingWallpaper = false;
              resolve(urlResult);
              return;
            }
            
            // 如果使用的是旧壁纸，先返回旧壁纸，然后在后台加载新壁纸
            this.isLoadingWallpaper = true;
            resolve(urlResult);
            
            // 后台加载今天的壁纸（不需要显示loading提示）
            this.loadNewWallpaper(cache, wallpapers, null).catch(err => {
              console.error('后台加载新壁纸失败：', err);
              this.isLoadingWallpaper = false;
            });
            return;
          }
        }
        
        // 没有任何缓存，需要首次加载
        this.isFirstLoad = true;
        this.isLoadingWallpaper = true;
        
        // 显示初始化提示
        let hideLoading = null;
        if (this.rootStore?.tools?.messageApi) {
          hideLoading = this.rootStore.tools.messageApi.loading('当前正在初始化壁纸，请稍后', 0);
        }
        
        // 加载新壁纸
        this.loadNewWallpaper(cache, wallpapers, hideLoading)
          .then((urlResult) => {
            if (urlResult) {
              resolve(urlResult);
            } else {
              reject(new Error('加载壁纸失败'));
            }
          })
          .catch((err) => {
            reject(err);
          });
      }).catch((err) => {
        console.error('读取 Bing 背景缓存失败：', err);
        // 读取缓存失败，当作首次加载处理
        this.isFirstLoad = true;
        this.isLoadingWallpaper = true;
        
        let hideLoading = null;
        if (this.rootStore?.tools?.messageApi) {
          hideLoading = this.rootStore.tools.messageApi.loading('当前正在初始化壁纸，请稍后', 0);
        }
        
        this.loadNewWallpaper(null, [], hideLoading)
          .then((urlResult) => {
            if (urlResult) {
              resolve(urlResult);
            } else {
              reject(new Error('加载壁纸失败'));
            }
          })
          .catch((rejectErr) => {
            reject(rejectErr);
          });
      });
    });
  }

  // 加载新壁纸
  loadNewWallpaper(existingCache, existingWallpapers, hideLoading = null) {
    return new Promise((resolve, reject) => {
      api
        .get(
          `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`
        )
        .then(async (res) => {
          if (res && res.images && res.images[0]) {
            const { urlbase } = res.images[0];
            const originSrcUrl = `https://cn.bing.com${urlbase}_UHD.jpg`;

            try {
              // 将 UHD 图片转为 base64
              const dataUrl = await getBase64Image(originSrcUrl);
              let thumbnailDataUrl = null;

              try {
                // 生成一张较小的缩略图
                thumbnailDataUrl = await createThumbnail(originSrcUrl, 800, 600);
              } catch (thumbErr) {
                console.error('生成 Bing 背景缩略图失败：', thumbErr);
              }

              const blob = base64ToBlob(dataUrl);
              const localSrcUrl = URL.createObjectURL(blob);

              let localThumbnailUrl = localSrcUrl;
              if (thumbnailDataUrl) {
                const thumbBlob = base64ToBlob(thumbnailDataUrl);
                localThumbnailUrl = URL.createObjectURL(thumbBlob);
              }

              // 创建新的壁纸对象
              const newWallpaper = {
                dataUrl,
                thumbnailDataUrl,
                originSrcUrl,
                time: dayjs().format()
              };

              // 更新缓存数组：将新壁纸添加到开头，清理旧壁纸
              let updatedWallpapers = existingWallpapers || [];
              
              // 检查是否已存在当天的壁纸，如果存在则替换，否则添加到开头
              const today = dayjs();
              const todayIndex = updatedWallpapers.findIndex(wp => 
                wp.time && dayjs(wp.time).isSame(today, 'day')
              );
              
              if (todayIndex >= 0) {
                updatedWallpapers[todayIndex] = newWallpaper;
              } else {
                updatedWallpapers.unshift(newWallpaper);
              }
              
              // 清理超过15天的旧壁纸，但至少保留1份
              updatedWallpapers = this.cleanOldWallpapers(updatedWallpapers);

              // 保存到缓存
              Storage.set('bingImg', {
                wallpapers: updatedWallpapers,
                lastUpdateTime: dayjs().format()
              });

              // 更新显示
              this.bgUrl = localSrcUrl;
              this.bgThumbnailUrl = localThumbnailUrl;

              // 关闭加载提示
              this.isLoadingWallpaper = false;
              this.isFirstLoad = false;
              
              if (hideLoading) {
                hideLoading();
              }

              resolve({
                srcUrl: localSrcUrl,
                thumbnailUrl: localThumbnailUrl
              });
            } catch (e) {
              console.error('Bing 背景 base64 转换失败，回退到直接使用远程地址：', e);
              const srcUrl = originSrcUrl;
              const thumbnailUrl = `https://cn.bing.com${urlbase}_800x600.jpg`;
              
              // 即使失败也保存远程地址
              const newWallpaper = {
                srcUrl,
                thumbnailUrl,
                originSrcUrl,
                time: dayjs().format()
              };
              
              let updatedWallpapers = existingWallpapers || [];
              const today = dayjs();
              const todayIndex = updatedWallpapers.findIndex(wp => 
                wp.time && dayjs(wp.time).isSame(today, 'day')
              );
              
              if (todayIndex >= 0) {
                updatedWallpapers[todayIndex] = newWallpaper;
              } else {
                updatedWallpapers.unshift(newWallpaper);
              }
              
              updatedWallpapers = this.cleanOldWallpapers(updatedWallpapers);
              
              Storage.set('bingImg', {
                wallpapers: updatedWallpapers,
                lastUpdateTime: dayjs().format()
              });

              this.bgUrl = srcUrl;
              this.bgThumbnailUrl = thumbnailUrl;
              
              this.isLoadingWallpaper = false;
              this.isFirstLoad = false;
              
              if (hideLoading) {
                hideLoading();
              }

              resolve({
                srcUrl,
                thumbnailUrl
              });
            }
          } else {
            this.isLoadingWallpaper = false;
            this.isFirstLoad = false;
            if (hideLoading) {
              hideLoading();
            }
            reject(new Error('获取壁纸数据失败'));
          }
        })
        .catch((err) => {
          console.error('加载新壁纸失败：', err);
          this.isLoadingWallpaper = false;
          this.isFirstLoad = false;
          if (hideLoading) {
            hideLoading();
          }
          reject(err);
        });
    });
  }

  getImgToCache = (type) => {
    return new Promise((resolve, reject) => {
      this.rootStore.option.getOption(type).then((blob) => {
        // console.log('%c [ blob ]-167', 'font-size:13px; background:pink; color:#bf2c9f;', blob instanceof Blob)
        if (typeof blob === 'string') {
          blob = base64ToBlob(blob);
        } 
        var url = URL.createObjectURL(blob)
        // console.log('%c [ url ]-174', 'font-size:13px; background:pink; color:#bf2c9f;', url)
        resolve(url);
      });
    });
  }
}