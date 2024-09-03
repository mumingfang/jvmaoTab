import React from "react";

class TextOnlyComponent extends React.Component {
    createMarkup(htmlString) {
        return { __html: htmlString };
    }

    extractText(htmlString) {
        // 创建一个新的div元素，并设置其innerHTML为传入的HTML字符串
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        // 使用textContent属性获取纯文本
        return tempDiv.textContent || tempDiv.innerText || "";
    }

    render() {
        // 假设this.props.content是你想要过滤的HTML字符串
        const rawHtml = this.props.content;
        const textOnly = this.extractText(rawHtml);

        return <>{textOnly}</>;
    }
}

export default TextOnlyComponent;
