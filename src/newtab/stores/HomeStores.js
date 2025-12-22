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
  rootStore;

  constructor(rootStore) {
    makeObservable(this, {
      bgUrl: observable,
      bgThumbnailUrl: observable,
      bg2Url: observable,
      isBg2: observable,
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
    // 先获取当前缓存的 originSrcUrl，用于排除当前壁纸
    Storage.get('bingImg').then((bingImg) => {
      const currentOriginUrl = bingImg?.originSrcUrl || null;

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

              // 存储到本地，覆盖旧的缓存，这样新标签页打开时就会用新的
              Storage.set('bingImg', {
                dataUrl,
                thumbnailDataUrl,
                originSrcUrl,
                time: dayjs().format()
              });
            } catch (e) {
              console.error('随机 Bing 背景 base64 转换失败，回退到直接使用远程地址：', e);
              // 失败时直接使用远程地址，但不存储（避免覆盖已有缓存）
              this.bgUrl = originSrcUrl;
              this.bgThumbnailUrl = thumbnailUrl;
            }
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }).catch((err) => {
      console.error('读取 Bing 背景缓存失败：', err);
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


  getBingBg() {
    return new Promise((resolve, reject) => {
      let loadNew = true;
      Storage.get('bingImg').then((bingImg) => {
        if (bingImg) {
          const {
            dataUrl,
            thumbnailDataUrl,
            time,
            srcUrl,
            thumbnailUrl
          } = bingImg;

          if (dayjs(time).isSame(dayjs(), 'day')) {
            // 优先使用本地 base64 缓存，避免每次新标签页都重新从网络加载
            if (dataUrl) {
              try {
                const blob = base64ToBlob(dataUrl);
                const localSrcUrl = URL.createObjectURL(blob);
                let localThumbnailUrl = localSrcUrl;

                if (thumbnailDataUrl) {
                  const thumbBlob = base64ToBlob(thumbnailDataUrl);
                  localThumbnailUrl = URL.createObjectURL(thumbBlob);
                }

                resolve({
                  srcUrl: localSrcUrl,
                  thumbnailUrl: localThumbnailUrl
                });
                loadNew = false;
              } catch (e) {
                console.error('解析本地 Bing 背景缓存失败，回退到远程地址：', e);
              }
            } else if (srcUrl) {
              // 兼容老数据结构：只有远程地址，没有 base64
              resolve({
                srcUrl,
                thumbnailUrl
              });
              loadNew = false;
            }
          }
        }

        if (loadNew) {
          api
            .get(
              `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`
            )
            .then(async (res) => {
              // console.log("[ res ] >", res);
              if (res && res.images && res.images[0]) {
                const {
                  urlbase
                } = res.images[0];
                const originSrcUrl = `https://cn.bing.com${urlbase}_UHD.jpg`;

                try {
                  // 将 UHD 图片转为 base64，做到一天仅网络加载一次，其余从本地读取
                  const dataUrl = await getBase64Image(originSrcUrl);
                  let thumbnailDataUrl = null;

                  try {
                    // 生成一张较小的缩略图，用于需要时的快速展示（例如第二壁纸等场景）
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

                  resolve({
                    srcUrl: localSrcUrl,
                    thumbnailUrl: localThumbnailUrl
                  });

                  Storage.set('bingImg', {
                    dataUrl,
                    thumbnailDataUrl,
                    originSrcUrl,
                    time: dayjs().format()
                  });
                } catch (e) {
                  console.error('Bing 背景 base64 转换失败，回退到直接使用远程地址：', e);
                  const srcUrl = originSrcUrl;
                  const thumbnailUrl = `https://cn.bing.com${urlbase}_800x600.jpg`;
                  resolve({
                    srcUrl,
                    thumbnailUrl
                  });
                  Storage.set('bingImg', {
                    srcUrl,
                    thumbnailUrl,
                    originSrcUrl,
                    time: dayjs().format()
                  });
                }
              }
            })
            .catch((err) => {
              reject(err);
              console.log(err);
            });
        }

      })
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