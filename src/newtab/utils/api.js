import axios from "axios";
// import { getOption } from "./option";

export const host =
  // eslint-disable-next-line no-undef
  process.env.NODE_ENV === "development" ? "http://127.0.1.1" : "/";

function http(url, data, method = "GET") {
  return new Promise((resolve, reject) => {
    // getOption("user").then((res) => {
      const options = {
        url,
        method,
        headers: {
          "content-type": "application/json",
        },
        data,
      };
    //   if (res?.token) {
    //     options.headers.token = res.token;
    //   }
      axios(options)
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    // });
  });
}

const api = {
  get: (url, data = []) => http(url, data, "GET"),
  post: (url, data = []) => http(url, data, "POST"),
};

api.jsonp = (url, data) => {
  if (!url) throw new Error("url is necessary");
  const callback = "CALLBACK" + Math.random().toString().substr(9, 18);
  const JSONP = document.createElement("script");
  JSONP.setAttribute("type", "text/javascript");

  const headEle = document.getElementsByTagName("head")[0];

  let ret = "";
  if (data) {
    if (typeof data === "string") ret = "&" + data;
    else if (typeof data === "object") {
      for (let key in data)
        ret += "&" + key + "=" + encodeURIComponent(data[key]);
    }
    ret += "&_time=" + Date.now();
  }
  JSONP.src = `${url}?callback=${callback}${ret}`;
  return new Promise((resolve, reject) => {
    window[callback] = (r) => {
      resolve(r);
      headEle.removeChild(JSONP);
      delete window[callback];
    };
    headEle.appendChild(JSONP);
  });
};

export default api;

export const get360Type = () => {
  return new Promise((resolve, reject) => {
    api
      .get(
        "http://cdn.apc.360.cn/index.php?c=WallPaper&a=getAllCategoriesV2&from=360chrome"
      )
      .then((res) => {
        if (res && res.data) {
          resolve(res.data);
        }
      })
      .catch((err) => {
        reject(err);
        console.log(err);
      });
  });
};

export const get360imgList = ({ cat, page, count = 20 }) => {
  const p = page - 1 < 0 ? 0 : page - 1;
  console.log("p", p);
  return new Promise((resolve, reject) => {
    api
      .get(
        `http://wallpaper.apc.360.cn/index.php?c=WallPaper&a=getAppsByCategory&cid=${cat}&start=${
          p * count
        }&count=${count}&from=360chrom`
      )
      .then((res) => {
        if (res && res.data) {
          resolve({
            list: res.data,
            total: res.total,
          });
        }
      })
      .catch((err) => {
        reject(err);
        console.log(err);
      });
  });
};

export const login = (data) => {
  return new Promise((resolve, reject) => {
    api
      .post(host + "/api/jvmao_user/login", data)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const ems = (data) => {
  return new Promise((resolve, reject) => {
    api
      .post(host + "/api/ems/send", data)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getSessionToken = () => {
  return new Promise((resolve, reject) => {
    api
      .post(host + "/api/jvmao_user/getSessionToken")
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
