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
  // 在body里底部插入一个id为root的div
  const root = document.createElement("div");
  // console.log("[ root ] >", root);
  root.id = "jvmao_net_root";
  document.body.appendChild(root);
  const r = createRoot(root);
  r.render(<App />);
});
