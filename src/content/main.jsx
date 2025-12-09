import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

function ready(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ready(() => {
  // 检查是否已经存在 root 元素，避免重复创建
  let root = document.getElementById("jvmao_net_root");
  if (!root) {
    // 在body里底部插入一个id为root的div
    root = document.createElement("div");
    root.id = "jvmao_net_root";
    document.body.appendChild(root);
  }
  const r = createRoot(root);
  r.render(<App />);
});
