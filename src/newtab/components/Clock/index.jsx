import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs'; // 导入dayjs库
import { Solar, Lunar, HolidayUtil } from 'lunar-javascript'; // 导入dayjs库
import cx from 'classnames';
import './index.scss';

const Clock = (props) => {
    const { isSoBarDown } = props;
    const [currentTime, setCurrentTime] = useState(dayjs()); // 初始化状态为当前时间
    const [LunarTime, setLunarTime] = useState(); // 初始化状态为当前时间

    const initLunar = () => React.useCallback(() => {
        const d = Lunar.fromYmd(currentTime.format('YYYY'), currentTime.format('MM'), currentTime.format('DD'))
        console.log('%c [ d ]-11', 'font-size:13px; background:pink; color:#bf2c9f;', d)
        // setLunarTime();
    }, [currentTime])

    useEffect(() => {
        // 设置定时器每秒更新时间
        const timer = setInterval(() => {
            setCurrentTime(dayjs());
        }, 1000);
        // 组件卸载时清除定时器
        return () => {
            clearInterval(timer);
        };
    }, []);

    // 获取星期几的中文表示
    const getWeekDayCN = (date) => {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return weekdays[date.day()];
    };

    return (
        <div
            className={cx({
                isSoBarDown,
                'homeClock': true,
            })}>
            <div className='date'>
                <span>{currentTime.format('MM月DD日')}</span>
                <span>{getWeekDayCN(currentTime)}</span>
            </div>
            <time>{currentTime.format('HH:mm')}</time>
        </div>
    );
};

export default Clock; 