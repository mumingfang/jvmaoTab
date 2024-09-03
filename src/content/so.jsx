import React from "react";
import { SoIcon } from "../SearchIcon";
import { Tooltip } from 'antd';
import { IconArrowBarDown } from "@tabler/icons-react";
import styled from "styled-components";
import FavIconIcon from "../newtab/scenes/public/FavIconIcon";
import _ from "lodash";

const href = new URL(window.location.href);

function changeArray(arr, index) {
    if (index - 2 >= 0) {
        arr[index - 2] = 1.1;
    }
    if (index - 1 >= 0) {
        arr[index - 1] = 1.2;
    }
    arr[index] = 1.3;
    
    if (index + 1 < arr.length) {
        arr[index + 1] = 1.2;
    }
    if (index + 2 < arr.length) {
        arr[index + 2] = 1.1;
    }
    return arr;
}


const Wrap = styled.div`
    position: fixed;
    left: 20px;
    bottom: 50px;
    z-index: 99999;
`;

const Nav = styled.ul`
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    height: ${(props) => props.close ? 0 : 'auto'};
    transition: height 0.3s;
`;
const NavItem = styled.li`
    margin-top: 8px;
    cursor: pointer;
    width: calc(var(--jvmao-net-scale) * 28px);
    height: calc(var(--jvmao-net-scale) * 28px);
    overflow: hidden;
    transition: all 0.3s;
    svg,img {
        width: 100% !important;
        height: 100% !important;
    }
`;

const CloseIcon = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--fff);
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    border: 1px solid #eee;
    cursor: pointer;
    svg {
        transform: ${(props) => props.close ? 'rotate(180deg)' : 'rotate(0deg)'};
        transition: transform 0.3s;
    }
`;

const So = () => {
    const ref = React.useRef();
    const [loading, setLoading] = React.useState(true);
    const [soList, setSoList] = React.useState([]);
    const [n, setN] = React.useState(0);
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchParams, setSearchParams] = React.useState({});
    const [close, setClose] = React.useState(false);


    const get_text = React.useCallback(() => {
        return href.searchParams.get(searchParams[href.hostname]);
    }, [searchParams, href]);

    const onMouseEnter = React.useCallback((key) => {
        const newArr = new Array(n.length).fill(1);
        changeArray(newArr, key);
        setN(newArr);
    }, [n]);

    const onMouseLeave = React.useCallback(() => {
        setTimeout(() => {
            setN(new Array(n.length).fill(1));
        }, 50);
    }, [n]);



    React.useEffect(() => {

        chrome.runtime.sendMessage({
            type: "getOption",
        }, (res) => {
            // console.log('%c [ res ]-136', 'font-size:13px; background:pink; color:#bf2c9f;', res)
            if (typeof res['soList'] !== 'undefined' && res['soList'].length > 0) {
                // 
                const _n = [];
                const hosts = [];
                const soList = res['customkey']?.length ? [...SoIcon, ...res['customkey']] : SoIcon;
                const activeSoList = res['soList'].map((v, k) => {
                    _n[k] = 1;
                    return _.find(soList, function (o) { return o.key === v; })
                });

                activeSoList.forEach((v, k) => {
                    (v.host || []).forEach((host) => {
                        hosts[host] = v.searchParams;
                    })
                });

                const currentDomain = href.hostname;
                const params = new URLSearchParams(window.location.search);
                if (hosts[currentDomain] && params.has(hosts[currentDomain])) {
                    setLoading(false);
                    setSoList(activeSoList);
                    setSearchParams(hosts);
                    setN(_n);
                    if (res['soAOpen']) {
                        setIsOpen(true);
                    }
                }
            }
        });
    }, [])

    if (loading) {
        return null;
    }

    return (
        <Wrap>
            <Tooltip placement="right" title="橘猫起始页" >
                <CloseIcon onClick={() => setClose(!close)} close={close}>
                    <IconArrowBarDown
                        size={14}
                    />
                </CloseIcon>
            </Tooltip>

            <Nav
                close={close}
                ref={ref}
                onMouseLeave={() => {
                    onMouseLeave();
                }}
            >
                {soList.map((item, k) => {
                    return !(item.host || []).includes(href.host) ? (
                        <NavItem
                            key={item.name}
                            onMouseEnter={() => {
                                onMouseEnter(k);
                            }}
                            onClick={() => {
                                console.log("click", item.url + get_text());
                                window.open(item.url + get_text(), isOpen ? "_blank" : "_self");
                            }}
                            style={{ "--jvmao-net-scale": n[k] }}
                        >
                            <Tooltip placement="right" title={item.name} >
                                {item.icon ? item.icon : <div><FavIconIcon size={80} url={item.url} onlyDomain /></div>}
                            </Tooltip>
                        </NavItem>
                    ) : null;
                })}
            </Nav>
        </Wrap>
    );
};

export default So;