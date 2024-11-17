
import React from "react";
import styled from "styled-components";

// import { Modal, Form, Divider } from "antd";

const Wrap = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    h2 {
        margin: 0;
    }
    ul {
        padding-left: 18px;
        flex: 1;
        overflow-y: auto;
    }
`;

const UpdateRecords = () => {

    return (
        <Wrap >
            <h2>更新日志</h2>
            <ul className="scroll-container">
                <li>
                    <span>1.2.7</span>
                    <ul>
                        <li>修复: 快捷搜索跳转icon不显示问题</li>
                        <li>修复: 搜索下拉框位置问题</li>
                        <li>修复: 搜索特定字符不生效问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.6</span>
                    <ul>
                        <li>优化: 搜索框为圆角时首页图标也改为圆角</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.5</span>
                    <ul>
                        <li>修复: 搜索引擎设置排序问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.4</span>
                    <ul>
                        <li>新增: 只是设置暗色模式下壁纸透明度</li>
                        <li>优化: 抽屉链接改用A标签方式</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.3</span>
                    <ul>
                        <li>修复: 抽屉默认只选择第一个</li>
                        <li>优化: 菜单项目</li>
                        <li>优化: 搜索本地链接数量限制为5个</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.2</span>
                    <ul>
                        <li>修复: 某些情况下WebDav同步失败的问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.1</span>
                    <ul>
                        <li>修复: 搜索下拉框不显示问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.2.0</span>
                    <ul>
                        <li>新增: 支持WebDav远端同步</li>
                        <li>新增: 必应壁纸支持右键下载</li>
                        <li>优化: 搜索结果页图标展示</li>
                    </ul>
                </li>
                <li>
                    <span>1.1.1</span>
                    <ul>
                        <li>修复: 暗黑模式下打开页面会闪白问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.1.0</span>
                    <ul>
                        <li>新增: 暗黑模式</li>
                        <li>新增: 首屏支持显示时间和日期</li>
                        <li>新增: 首屏快捷链接支持行数选择</li>
                        <li>新增: 支持搜索框一直保持水平居中</li>
                        <li>新增: 支持滚动返回首屏</li>
                        <li>新增: 搜索框支持按Tab切换搜索源</li>
                        <li>新增: 支持修改页面标题</li>
                        <li>修复: 首屏图标排序跟抽屉分组不一致问题</li>
                        <li>修复: 无法删除自定义搜索源问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.0.1</span>
                    <ul>
                        <li>修复: 导入数据部分选项不生效问题</li>
                        <li>修复: 搜索框回车无法跳转问题</li>
                    </ul>
                </li>
                <li>
                    <span>1.0.0</span>
                    <ul>
                        <li>新增: 搜索支持本地连接搜索</li>
                        <li>新增: 异常页面增加导出数据按钮</li>
                        <li>新增: 导航增加数据导出按钮</li>
                        <li>修复: 测试阶段已知的问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.4.1</span>
                    <ul>
                        <li>修复: 某些情况下资源展示问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.4.0</span>
                    <ul>
                        <li>新增：网址拖拽到右下角删除</li>
                    </ul>
                </li>
                <li>
                    <span>0.3.0</span>
                    <ul>
                        <li>修复：网址URL为空时导致报错问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.11</span>
                    <ul>
                        <li>新增：必应翻译</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.10</span>
                    <ul>
                        <li>新增：支持添加自定义搜索源</li>
                        <li>新增：移动分组功能（右击分组标题开启）</li>
                        <li>修复：新增连接后无法正常编辑问题</li>
                        <li>修复：第二壁纸显示动效问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.9</span>
                    <ul>
                        <li>新增：数据导入导出功能</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.8</span>
                    <ul>
                        <li>修复: 0.2.7版本导致的壁纸缓存报错</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.7</span>
                    <ul>
                        <li>修复: 抽屉导航无法滚动问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.6</span>
                    <ul>
                        <li>优化: 修复第二壁纸显示逻辑</li>
                        <li>修复: 界面切换搜索下拉框展示问题</li>
                        <li>修复: 搜索下拉框点击逻辑</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.5</span>
                    <ul>
                        <li>修复: 必赢壁纸缓存报错问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.4</span>
                    <ul>
                        <li>新增: 新增链接在当前标签页中打开选项</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.3</span>
                    <ul>
                        <li>新增: 重构关于我界面</li>
                        <li>新增: 首屏右击增加关于入口</li>
                        <li>修复: 首屏分组为空时依旧展示黑框问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.2</span>
                    <ul>
                        <li>新增: 默认展示抽屉选项</li>
                        <li>新增: 搜索框在首屏底部选项</li>
                        <li>新增: 第二壁纸选项模糊处理</li>
                        <li>新增: 支持将分组钉在首屏</li>
                        <li>修复: 便签保存图片间距问题</li>
                        <li>修复: 首屏滚动触发逻辑</li>
                        <li>修复: 抽屉分组标题长度问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.1</span>
                    <ul>
                        <li>新增: 缓存必应壁纸</li>
                        <li>新增: 第二壁纸显示时，隐藏搜索框</li>
                    </ul>
                </li>
                <li>
                    <span>0.2.0</span>
                    <ul>
                        <li>新增: 便签</li>
                        <li>修复: 修复了搜索框有文字时且没有Focus时按回车键会跳转搜索的问题</li>
                        <li>修复: 部分弹窗背景没有高斯模糊的情况</li>
                        <li>修复: 部分情况下会出现黑边</li>
                    </ul>
                </li>
                <li>
                    <span>0.1.7</span>
                    <ul>
                        <li>修复: 必应壁纸分辨率调整为4K</li>
                    </ul>
                </li>
                <li>
                    <span>0.1.6</span>
                    <ul>
                        <li>修复: 首屏第二壁纸显示触发机制（仅在壁纸且鼠标不动的情况下才会触发）</li>
                    </ul>
                </li>
                <li>
                    <span>0.1.5</span>
                    <ul>
                        <li>新增: 添加按Esc返回首屏的方法</li>
                        <li>修复: 修复了某些搜索源导致的问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.1.4</span>
                    <ul>
                        <li>新增: 添加了新的搜索源</li>
                        <li>修复: 新增链接时灰色块宽度不一致问题</li>
                    </ul>
                </li>
                <li>
                    <span>0.1.3</span>
                    <ul>
                        <li>新增: 搜索框圆角样式</li>
                        <li>更新: 首选项Tab样式</li>
                        <li>修复: 浏览器扩展管理内不显示图标问题</li>
                        <li>修复: 某些情况下首屏依旧显示新增列表问题</li>
                    </ul>
                </li>
            </ul>
        </Wrap>
    );
};
export default UpdateRecords;
