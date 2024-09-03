import React from "react";

export default function useDebounce(fn, delay, dep = []) {
  const { current } = React.useRef({ fn, timer: null });
  React.useEffect(
    function () {
      current.fn = fn;
    },
    [fn]
  );

  return React.useCallback(function f(...args) {
    if (current.timer) {
      clearTimeout(current.timer);
    }
    current.timer = setTimeout(() => {
      current.fn.call(this, ...args);
    }, delay);
  }, dep);
}
