import React from "react";
import _ from "lodash";

const App = () => {

    React.useEffect(() => {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            switch (request.type) {
                case "onTextMenuCS":
                    var selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        var range = selection.getRangeAt(0);
                        var container = document.createElement("div");
                        container.appendChild(range.cloneContents());
                        sendResponse({ html: container.innerHTML }); // 这是HTML字符串
                    }
            }
            return true;
        });
    }, [])

    return null;
};

export default App;