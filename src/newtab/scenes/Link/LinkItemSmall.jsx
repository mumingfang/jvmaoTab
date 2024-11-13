import React from "react";
import { useCreation, useMemoizedFn } from "ahooks";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Tooltip } from "antd";
import FavIconIcon from "~/scenes/public/FavIconIcon";
import styled from "styled-components";
import { motion } from "framer-motion";

const Wrap = styled(motion.div)`
    padding: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--fff);
    border-radius: ${(props) => (props.isRound ? "30px" : "18px")};
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    .link-a {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
    }
    > img {
        border-radius: ${(props) => (props.isRound ? "30px" : "0")};
    }
`;

const animations = {
    show: {
        y: "0%",
        scale: 1,
        opacity: 1,
        transition: { duration: 0.2, delay: 0.2, ease: "easeOut" },
    },
    hidden: {
        y: "20%",
        opacity: 0,
        scale: 0.5,
        transition: { duration: 0.12, ease: "linear" },
    }
};

const LinkItemSmall = (props) => {
    const { isSoBarDown } = props;
    const { option } = useStores();
    const { linkOpenSelf } = option.item;

    const item = useCreation(() => {
        return (
            <Tooltip title={props.title} placement={isSoBarDown ? "top" : "bottom"}>
                <Wrap initial="hidden" animate="show" exit="hidden" variants={animations} isRound={option.item?.soStyleIsRound}>
                    <FavIconIcon size={28} url={props.url} />
                    <a className="link-a" href={props.url} target={linkOpenSelf ? '_blank' : '_self'} ></a>
                </Wrap>
            </Tooltip>

        );
    }, [props.title, props.url, linkOpenSelf, option.item?.soStyleIsRound]);

    return item;
};
export default observer(LinkItemSmall);
