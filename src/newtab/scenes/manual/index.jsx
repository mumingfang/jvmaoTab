import React from 'react';
import { useMemoizedFn } from 'ahooks';
import { motion } from "framer-motion";
import { Button, Result } from 'antd';
import cx from 'classnames';
import './index.scss';
import data from './page';
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";

const Cover = React.memo((props) => {
    const { img, imgAlt, title, onClick = () => { }, audioId, audioUrl } = props;
    return (
        <div className="storybook-cover" onClick={onClick}>
            <div className="storybook-cover-title">
                你好，橘猫起始页
            </div>
            <div className='icon'>
                <svg t="1712035252664" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5409" width="40" height="40"><path d="M483.878533 351.6413c-235.19772 23.008473-273.545175 345.12709-189.180775 536.864361 76.694909 176.39829 654.463222 232.641223 654.463222-178.954787 0-311.892629-186.624278-452.499962-465.282447-357.909574zM118.299468 200.807979c92.033891-12.782485 153.389818 15.338982 153.389818 120.155357 0 138.050836-191.737272 117.59886-217.302242 58.79943-28.121467-63.912424-15.338982-171.285296 63.912424-178.954787z m245.423708-15.338982C335.60171 88.322113 358.610182 16.740198 468.539552 1.401216c148.276824-20.451976 155.946315 189.180775 97.146884 224.971732-66.468921 40.903951-181.511284 43.460448-201.96326-40.903951zM793.214666 251.937918c-61.355927-69.025418-74.138412-135.494339 12.782484-194.293769 112.485866-76.694909 204.519757 92.033891 171.285297 145.720327-38.347454 58.79943-135.494339 107.372872-184.067781 48.573442z" fill="currentColor" p-id="5410"></path></svg>
            </div>
        </div>
    )
});

const PageText = React.memo((props) => {
    const { dom = () => { }, pageNum = "", onClick = () => { } } = props;
    return (
        <div className="storybook-page storybook-page-text" >
            {dom()}
            <span className='storybook-page-number'>{pageNum}</span>
        </div>
    )
});


const canShow = (active, k) => {
    if (Math.abs(active - k) <= 2) {
        return true;
    }
    return false;
}

function Manual(props) {
    const { option } = useStores();
    const [active, setActive] = React.useState(0);
    const [type, setType] = React.useState('next');
    const [books, setBooks] = React.useState([[]]);
    const [openState, setOpenState] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const { systemTheme } = option.item;

    const getSystemTheme = React.useCallback(() => option.getSystemTheme(), [systemTheme]);

    const closeBook = useMemoizedFn(() => {
        setActive(0);
        setOpenState(books.map((v) => false));
    }, [active]);

    const next = useMemoizedFn(() => {
        if (loading) {
            return;
        }
        const k = active ? active : 0;
        if (k === books.length - 1) {

            setActive(0);

            setOpenState(books.map((v) => false));
            return;
        }

        setType('next');
        setActive(k + 1);
        setOpenState((v) => {
            const _v = [...v];
            _v[k] = true;
            return _v;
        })

    }, [active, loading]);

    const prev = useMemoizedFn(() => {
        if (loading) {
            return;
        }
        const k = active ? active : 0;
        if (k <= 0) {
            return;
        }

        setType('prev');
        setActive(k - 1);
        setOpenState((v) => {
            const _v = [...v];
            _v[k - 1] = false;
            return _v;
        })
    }, [active, loading]);

    const initData = useMemoizedFn((data) => {
        const list = [];


        list.push(['', (
            <Cover onClick={() => next()} />
        )]);

        (data?.pages || []).map((v, k) => {
            list[list.length - 1][0] = (
                <PageText dom={v.left} onClick={() => prev()} />
            );
            list.push([
                '',
                (
                    <PageText dom={v.right} pageNum={`${k + 1} - ${data.pages.length}`} onClick={() => next()} />
                )]);
        })


        setBooks(list);

        setTimeout(() => {
            setLoading(false)
        }, 700);

    }, []);

    React.useEffect(() => {
        setOpenState(books.map((v) => false));
    }, [books]);

    React.useEffect(() => {
        initData(data);
    }, []);

    return (
        <motion.div
            className={cx({
                ['pages']: true,
                ['open']: active > 0,
                ['dark'] : getSystemTheme() === 'dark',
            })}

            initial={{
                transform: `translateX(-20%) scale(0.2)`,
            }}
            animate={{
                transform: `translateX(${active === 0 ? '-20%' : '0'}) scale(${active === 0 ? 0.7 : 1})`,
            }}
        >
            <div className={cx({
                ['storybook-hover storybook-page-nextHotZone']: true,
                ['storybook-page-nextHotZone-end']: active === books.length - 1,
            })} onClick={() => next()}></div>
            <div className="storybook-hover storybook-page-prevHotZone" onClick={() => prev()}></div>
            {books.map((v, k) => {
                const show = canShow(active, k);
                return (
                    <motion.div
                        key={k}
                        className={cx({
                            ['paper']: true,
                            ['open']: openState[k],
                            ['active']: active === k,
                            ['active-prev']: active - 1 === k,
                            [`paper-n-${k}`]: true,
                            ['loading']: k == 0 && loading,
                        })}
                        transition={{
                            zIndex: { delay: type === 'next' ? 0.5 : 0, ease: "easeOut" },
                            transform: { delay: type === 'next' ? 0 : 0.1, ease: "easeOut", duration: 1.2 }
                        }}
                        initial={{
                            zIndex: books.length - k,
                            transform: `perspective(180vw) rotateY(0deg)`,
                        }}
                        animate={{
                            zIndex: openState[k] ? 1 : books.length - k,
                            transform: `perspective(180vw) rotateY(${openState[k] ? -180 : active > 0 ? 0 : `-${26 - (k + 1)}`}deg)`,
                        }}
                    >
                        <div className={cx(['page', 'page-back', `page-back-${k}`])} >
                            {show ? v[0] : null}
                        </div>
                        <div className={cx(['page', 'page-front', `page-front-${k}`])}>
                            {show ? v[1] : null}
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );

}
export default observer(Manual)