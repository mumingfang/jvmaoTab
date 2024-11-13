import React from "react";
import './page.scss'
import About from "~/scenes/about/About";
import UpdateRecords from "~/scenes/about/UpdateRecords";
import { IconArrowWaveRightDown, IconArrowCurveLeft } from "@tabler/icons-react";
import ErrorImg from '~/assets/error.png';


const pages = [
    {
        left: () => {
            return (
                <div className="manual manual-l manual-1-l">
                    <p>真的很抱歉橘猫起始页里并没有橘猫。</p>
                </div>
            )
        },
        right: () => {
            return (
                <div className="manual manual-1">
                    <h2>橘猫<br />似乎天生就有<br />易于积蓄丰沛脂肪的体质<br />正如我一般。</h2>
                    <div className="tooltip">点这进行翻页 <IconArrowWaveRightDown size={24} stroke={1.2} /></div>
                </div>
            )
        }
    },
    {
        left: () => {
            return (
                <div className="manual manual-l manual-2-l">
                    <p>很期望您能在哔哩哔哩为我们的视频点赞、投币和转发。</p>
                    <p>我还在导航里放了一个网址导航的链接，希望你不要嫌弃，因为这是jvmao.net这个域名的前身，如果你实在不喜欢，可以在设置中选择关闭</p>
                    <p>非常感谢我老婆大人的支持❤️，她是我的第一用户，所以她提的需求优先级也是最高的。</p>
                </div>
            )
        },
        right: () => {
            return (
                <div className="manual manual-2">
                    <About />
                </div>

            )
        },
    },
    {
        left: () => {
            return (
                <div className="manual manual-l manual-3-l">
                    <div>
                        <h4>小技巧</h4>
                        <p>在首屏没有光标的情况下，输入秘籍就可以打开一个暗格。</p>
                        <p>在首屏壁纸处双击会得到一个便签。</p>
                        <p>右击抽屉分组标题，可以把这个分组贴在首屏，但最多显示14个。</p>
                        <p>在首屏右击便签头部可以发送一封消息送给未来的你，注意选择的时间并非是准确的，我加了一点随机的浮动因素来增加不确定性。</p>
                        <p>点击上一页的的logo，会展示我的头像，当然这没有什么啥用，但你能知道这个插件是谁做的。</p>
                    </div>
                </div>
            )
        },
        right: () => {
            return (
                <div className="manual manual-3">
                    <UpdateRecords />
                </div>

            )
        },
    },
    {
        left: () => {
            return (
                <div className="manual manual-l manual-4-l">
                    <div className="err_wrap">
                        <img src={ErrorImg} alt="" />
                        <div className="tooltip"><IconArrowCurveLeft size={24} stroke={1.2} /> 这里</div>
                    </div>
                    <p>如果你有发现这个页面，记得点击错误信息后，截图发给我们</p>
                    <div className="other">
                        <p>如果你在B站搜索到另外一个橘猫起始页,不要惊讶,那是我的异父异母的亲兄弟</p>
                    </div>
                </div>
            )
        },
        right: () => {

            // console.log('%c [  ]-82', 'font-size:13px; background:pink; color:#bf2c9f;', navigator.userAgent)
            return (
                <div className="manual manual-4">
                    <div className="afdian">
                        {/* <h4>赞助我</h4>
                        <iframe src="https://afdian.net/leaflet?slug=jvmao" width="100%" scrolling="no" height="200" frameborder="0"></iframe> */}
                    </div>

                    <h1>感谢,使用</h1>
                </div>

            )
        },
    },
];

const list = { pages }

export default list