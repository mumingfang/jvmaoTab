import {
    Node,
    mergeAttributes,
    nodeInputRule
} from '@tiptap/core';

const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;
const Image = Node.create({
    name: 'image',
    addOptions() {
        return {
            inline: false,
            allowBase64: false,
            HTMLAttributes: {},
        };
    },
    inline() {
        return this.options.inline;
    },
    group() {
        return this.options.inline ? 'inline' : 'block';
    },
    draggable: true,
    addAttributes() {
        return {
            src: {
                default: null,
            },
            alt: {
                default: null,
            },
            title: {
                default: null,
            },
            width: {
                default: null,
            },
            height: {
                default: null,
            },
            'data-id': {
                default: null,
            },
            'sizeSlug': {
                default: null,
            },
        };
    },
    parseHTML() {
        return [{
            tag: this.options.allowBase64 ?
                'img[src]' : 'img[src]:not([src^="data:"])',
        }, ];
    },
    renderHTML({
        HTMLAttributes
    }) {
        // 图片加载后获取宽高
        const onImageLoad = (event) => {
            const {
                naturalHeight
            } = event.target;
            const roundedHeight = Math.ceil(naturalHeight / 50) * 50 + 50; // 计算最近的50的倍数高度

            // 设置figure的样式
            const figureStyle = `height: ${roundedHeight}px;`;
            event.target.parentNode.setAttribute('style', figureStyle);
        };

        // 创建img元素并设置加载事件监听
        const imgElement = document.createElement('img');
        imgElement.onload = onImageLoad;

        const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

        for (const key in attrs) {
            if (Object.hasOwnProperty.call(attrs, key)) {
                const value = attrs[key];
                imgElement.setAttribute(key, value);
            }
        }

        // 返回figure和img元素
        return [
            'figure',
            {
                class: 'sn-block-image',
                style: 'height: auto;'
            },
            imgElement,
        ];
    },
    addCommands() {
        return {
            setImage: options => ({
                commands
            }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },
});

export {
    Image,
    Image as
    default,
    inputRegex
};
//# sourceMappingURL=index.js.map