import React from "react";
import { observer } from "mobx-react";
import { Modal, Form, Divider } from "antd";
import useStores from "~/hooks/useStores";
import styled from "styled-components";
import { useLongPress, useMemoizedFn } from "ahooks";
import logoMmf from "~/assets/logo-muming.png";
import logo from "~/assets/logo.png";
import manifest from "../../../manifest";
import { writeText } from "~/utils";

const Wrap = styled.div`
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 200px;
`;
const LogoWrap = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    span {
        letter-spacing: 1px;
        color: #555;
        font-size: 16px;
    }
    p {
        margin: 0;
        font-size: 12px;
        color: #888;
        margin-top: 3px;
    }
    i {
        font-size: 12px;
        color: #999;
        font-style: normal;
        margin-top: 14px;
    } 
`;
const FooterWrap = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px;
    a,span {
        font-size: 12px;
        color: #999;
    }
`;

const About = () => {
    const { tools } = useStores();
    const wrapRef = React.useRef();
    const [i, setI] = React.useState(0);

    const onCopy = useMemoizedFn((text) => {
        writeText(text).then((res) => {
            if (res) {
                tools.messageApi.open({
                    type: "success",
                    content: "复制成功",
                });
            } else {
                tools.messageApi.open({
                    type: "error",
                    content: "复制失败",
                });
            }
        });
    }, []);

    useLongPress(() => {
        setI(1);
    }, wrapRef, {
        onLongPressEnd: () => {
            setI(0);
        }
    });

    return (
        <Wrap ref={wrapRef}>
            <LogoWrap>
                <img src={i ? logoMmf : logo} alt="霂明坊" width={120} height={120} />
                <span>{i ? "霂明坊" : "橘猫起始页"}</span>
                <p>解决问题，不是创造需求</p>
                <i>{manifest.version}</i>
            </LogoWrap>
            <FooterWrap>
                <a href="https://jvmao.net" target="_blank" rel="noopener noreferrer">官方网站</a>
                <a href="https://space.bilibili.com/3546388988168879" target="_blank" rel="noopener noreferrer">哔哩哔哩</a>
                <a href="https://github.com/mumingfang/jvmaoTab" target="_blank" rel="noopener noreferrer">Github</a>
                <span onClick={() => onCopy('429303318')}>QQ群: 429303318</span>
            </FooterWrap>

        </Wrap>
    );
};
export default observer(About);
