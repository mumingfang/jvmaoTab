import LinkStore from "./LinkStores";
import OptionStores from "./OptionStores";
import ToolsStores from "./ToolStores";
import HomeStores from "./HomeStores";
import NoteStores from "./NoteStores";
import DataStores from "./DataStores";

export default class RootStore {
  link;
  option;
  tools;
  home;
  note;
  data;

  constructor() {
    this.option = new OptionStores(this);
    this.link = new LinkStore(this);
    this.tools = new ToolsStores(this);
    this.home = new HomeStores(this);
    this.note = new NoteStores(this);
    this.data = new DataStores(this);
  }
}
