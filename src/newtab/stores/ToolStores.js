import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import {
  getID
} from "~/utils";
import {
  downloadBlob
} from "~/utils";
import {
  db
} from "~/db";
import _ from "lodash";
import dayjs from 'dayjs'
import manifest from "../../manifest";

export default class ToolsStores {
  rightClickOpen = false;
  rightClickEvent = {
    mouseX: 0,
    mouseY: 0,
  };
  rightClickMenu = null;
  messageApi = null;
  preferencesOpen = false;
  tabListDrawer = false;

  openPublicModalEvent$ = null;

  timeKey = "";

  rootStore;

  constructor(rootStore) {
    makeObservable(this, {
      rightClickOpen: observable,
      rightClickEvent: observable,
      rightClickMenu: observable,
      preferencesOpen: observable,
      messageApi: observable,
      tabListDrawer: observable,
      openPublicModalEvent$: observable,
      timeKey: observable,
      setRightClickEvent: action,
      setOpenPublicModalEvent: action,
    });
    this.rootStore = rootStore;
  }

  setRightClickEvent(e, menu = []) {
    if (e) {
      this.rightClickOpen = true;
      this.rightClickEvent = {
        mouseX: e?.clientX + 10,
        mouseY: e?.clientY + 10,
      };
      this.rightClickMenu = menu;
    } else {
      this.rightClickOpen = false;
    }
  }

  success(message = "") {
    if (message) {
      this.messageApi.success(message);
    }
  }
  error(message = "") {
    if (message) {
      this.messageApi.error(message);
    }
  }

  updateTimeKey() {
    this.timeKey = getID();
  }

  setOpenPublicModalEvent(event) {
    this.openPublicModalEvent$ = event;
  }

  openPublicModal(type, data = {}, width = 600, title = "") {
    if (this.openPublicModalEvent$) {
      this.openPublicModalEvent$.emit({
        type,
        data,
        width,
        title,
      });
    }
  }

  closePublicModal() {
    if (this.openPublicModalEvent$) {
      this.openPublicModalEvent$.emit({
        type: "close",
      });
    }
  }

  onExport = async () => {
    try {
      const blob = await this.rootStore.data.get_dbData();
      const fileName = `jvmao_${manifest.version}_${db.verno * 10}_${dayjs().format('YYMMDDHHmmss')}.json`;
      downloadBlob(blob, fileName);
      this.success('数据导出成功');
      return true;
    } catch (error) {
      this.error(`${error.message}`);
      return false;
    }

  }
}