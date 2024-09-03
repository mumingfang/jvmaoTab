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
  base64ToBlob
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
      showBg1: action,
      showBg2: action,
    });
    this.rootStore = rootStore;
  }

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
            srcUrl,
            thumbnailUrl,
            time
          } = bingImg;

          if (dayjs(time).isSame(dayjs(), 'day')) {
            resolve({
              srcUrl,
              thumbnailUrl
            });
            loadNew = false;
          }
        }

        if (loadNew) {
          api
            .get(
              `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`
            )
            .then((res) => {
              // console.log("[ res ] >", res);
              if (res && res.images && res.images[0]) {
                const {
                  urlbase
                } = res.images[0];
                const srcUrl = `https://cn.bing.com${urlbase}_UHD.jpg`;
                const thumbnailUrl = `https://cn.bing.com${urlbase}_800x600.jpg`;
                resolve({
                  srcUrl,
                  thumbnailUrl
                });
                Storage.set('bingImg', {
                  'srcUrl': srcUrl,
                  'thumbnailUrl': thumbnailUrl,
                  'time': dayjs().format()
                });
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
        console.log('%c [ blob ]-167', 'font-size:13px; background:pink; color:#bf2c9f;', blob instanceof Blob)
        if (typeof blob === 'string') {
          blob = base64ToBlob(blob);
        } 
        var url = URL.createObjectURL(blob)
        console.log('%c [ url ]-174', 'font-size:13px; background:pink; color:#bf2c9f;', url)
        resolve(url);
      });
    });
  }
}