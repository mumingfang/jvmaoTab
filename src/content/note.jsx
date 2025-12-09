import React from "react";

const App = () => {

    React.useEffect(() => {
        const messageListener = function (request, sender, sendResponse) {
            try {
                switch (request.type) {
                    case "onTextMenuCS":
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            try {
                                const range = selection.getRangeAt(0);
                                const container = document.createElement("div");
                                container.appendChild(range.cloneContents());
                                sendResponse({ html: container.innerHTML }); // 这是HTML字符串
                            } catch (error) {
                                console.error("Error processing selection:", error);
                                sendResponse({ html: "" });
                            }
                        } else {
                            sendResponse({ html: "" });
                        }
                        break;
                    default:
                        // 对于其他类型的消息，不返回 true，让系统知道这是同步响应
                        return false;
                }
                // 返回 true 表示异步响应（虽然这里是同步的，但保持原有行为）
                return true;
            } catch (error) {
                console.error("Error in message listener:", error);
                sendResponse({ html: "" });
                return true;
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        // 清理函数：移除监听器
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, [])

    return null;
};

export default App;