import React from "react";
import { observer } from "mobx-react";
import { Form, Checkbox, Select, Divider, Button, Modal, Input, Space, Typography } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import useStores from "~/hooks/useStores";
import UploadImg from "~/components/UploadImg";
import { db } from "~/db";
import { refreshFaviconForUrl } from "~/utils/favicon";
import _ from "lodash";
import { DEFAULT_HIDDEN_SHORTCUT, MAX_HIDDEN_SHORTCUT_LENGTH, normalizeHiddenShortcut, normalizeShortcutKey } from "~/utils/hiddenShortcut";

const options = [
    {
        label: '4个',
        value: 4,
    }, {
        label: '6个',
        value: 6,
    }, {
        label: '8个',
        value: 8,
    }
];

const homeLinkMaxNumOption = [
    {
        label: '一行',
        value: 7,
    },
    {
        label: '两行',
        value: 14,
    },
    {
        label: '三行',
        value: 21,
    },
    {
        label: '四行',
        value: 28,
    },
    {
        label: '五行',
        value: 35,
    },

];

const PreferencesLink = () => {
    const { option, tools } = useStores();
    const _option = _.cloneDeep(option.item);
    const [verifiedShortcut, setVerifiedShortcut] = React.useState(false);
    const [enteredKeyCount, setEnteredKeyCount] = React.useState(0);
    const verifyBuffer = React.useRef([]);
    const verifyInput = React.useRef(null);
    const [recording, setRecording] = React.useState(false);
    const [draftShortcut, setDraftShortcut] = React.useState([]);
    const [savingShortcut, setSavingShortcut] = React.useState(false);
    const shortcutInput = React.useRef(null);
    const currentShortcut = normalizeHiddenShortcut(option.item.pwKey);
    const formatShortcut = (keys) => keys.map((key) => ({ ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" })[key] || key.toUpperCase()).join(" → ");

    React.useEffect(() => {
        setVerifiedShortcut(false);
        setEnteredKeyCount(0);
        verifyBuffer.current = [];
    }, [option.item.pwKey]);

    const verifyShortcutKey = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Backspace" || event.key === "Escape") {
            verifyBuffer.current = event.key === "Escape" ? [] : verifyBuffer.current.slice(0, -1);
            setEnteredKeyCount(verifyBuffer.current.length);
            return;
        }
        if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
        const key = normalizeShortcutKey(event.key);
        if (!key) return;
        verifyBuffer.current = [...verifyBuffer.current, key];
        if (verifyBuffer.current.length === currentShortcut.length) {
            const isCorrect = verifyBuffer.current.every((item, index) => item === currentShortcut[index]);
            verifyBuffer.current = [];
            setEnteredKeyCount(0);
            if (isCorrect) {
                setVerifiedShortcut(true);
                tools.messageApi?.success("验证通过，可以修改暗格按键");
            } else {
                tools.messageApi?.error("按键顺序不正确，请重新输入");
                verifyInput.current?.focus();
            }
        } else {
            setEnteredKeyCount(verifyBuffer.current.length);
        }
    };

    const startShortcutRecording = () => {
        setDraftShortcut([]);
        setRecording(true);
        setTimeout(() => shortcutInput.current?.focus(), 0);
    };

    const recordShortcutKey = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
            setRecording(false);
            return;
        }
        if (event.key === "Backspace") {
            setDraftShortcut((keys) => keys.slice(0, -1));
            return;
        }
        if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
        const key = normalizeShortcutKey(event.key);
        if (key) setDraftShortcut((keys) => keys.length < MAX_HIDDEN_SHORTCUT_LENGTH ? [...keys, key] : keys);
    };

    const saveShortcut = async (keys) => {
        setSavingShortcut(true);
        try {
            await option.setItem("pwKey", keys);
            setRecording(false);
            setDraftShortcut([]);
            setVerifiedShortcut(false);
            tools.messageApi?.success("暗格按键已保存；请记住新的按键顺序");
        } catch (error) {
            console.error("保存暗格按键失败", error);
            tools.messageApi?.error("保存失败，请重试");
        } finally {
            setSavingShortcut(false);
        }
    };
    const confirmShortcutSave = (keys) => {
        Modal.confirm({
            title: "确认保存暗格按键？",
            content: "保存后，设置中不会显示这串按键。请先记住或妥善记录；忘记后无法在这里修改或恢复默认。暗格仅隐藏界面，不加密数据。",
            okText: "已记住，保存",
            cancelText: "返回检查",
            onOk: () => saveShortcut(keys),
        });
    };
    const { linkSpan, copyClose, defaultOpenAdd, defauiltLink, linkOpenSelf, showLinkNav, homeLinkMaxNum, rollingBack } = _option;

    const handleChange = (value) => {
        if (!value || typeof value !== 'object') {
            return;
        }
        for (const key in value) {
            const v = value[key];
            option.setItem(key, v);
        }
    };

    // 批量获取所有抽屉图标
    const handleBatchFetchIcons = React.useCallback(async () => {
        try {
            // 获取所有链接
            const allLinks = await db.link.toArray();
            const allUrls = allLinks
                .filter(link => link.url && link.url.trim())
                .map(link => link.url);

            // 按域名去重，同一个域名只需要获取一次图标
            const domainUrlMap = new Map();
            allUrls.forEach(url => {
                try {
                    const origin = new URL(url).origin;
                    // 如果该域名还没有记录，或者当前URL更短（优先选择更简洁的URL）
                    if (!domainUrlMap.has(origin) || url.length < domainUrlMap.get(origin).length) {
                        domainUrlMap.set(origin, url);
                    }
                } catch {
                    // 无效URL，跳过
                }
            });

            const validUrls = Array.from(domainUrlMap.values());

            if (validUrls.length === 0) {
                tools.messageApi?.open({
                    type: 'info',
                    content: '没有找到需要获取图标的链接',
                    duration: 2,
                });
                return;
            }

            const total = validUrls.length;
            let processed = 0;
            let success = 0;
            let failed = 0;
            const batchSize = 7;
            const delay = 1000; // 1秒延迟

            // 显示开始通知
            const loadingKey = `batch-fetch-icons-${Date.now()}`;
            const originalCount = allUrls.length;
            const deduplicatedCount = validUrls.length;
            const dedupeInfo = originalCount !== deduplicatedCount 
                ? `（已去重：${originalCount} → ${deduplicatedCount}）` 
                : '';
            tools.messageApi?.open({
                key: loadingKey,
                type: 'info',
                content: `开始批量获取图标，共 ${total} 个域名${dedupeInfo}...`,
                duration: 0, // 不自动关闭
            });

            // 分批处理
            for (let i = 0; i < validUrls.length; i += batchSize) {
                const batch = validUrls.slice(i, i + batchSize);
                
                // 并行处理当前批次
                const batchPromises = batch.map(async (url) => {
                    try {
                        await refreshFaviconForUrl(url);
                        success++;
                    } catch (error) {
                        console.error(`[PreferencesLink] Failed to fetch icon for ${url}`, error);
                        failed++;
                    } finally {
                        processed++;
                    }
                });

                await Promise.all(batchPromises);

                // 更新进度通知
                tools.messageApi?.open({
                    key: loadingKey,
                    type: 'info',
                    content: `正在获取图标... ${processed}/${total} (成功: ${success}, 失败: ${failed})`,
                    duration: 0,
                });

                // 如果不是最后一批，等待1秒
                if (i + batchSize < validUrls.length) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            // 关闭进度通知，显示完成通知
            tools.messageApi?.destroy(loadingKey);
            tools.messageApi?.open({
                type: 'success',
                content: `批量获取图标完成！共处理 ${total} 个链接，成功 ${success} 个，失败 ${failed} 个`,
                duration: 4,
            });

            // 触发全局刷新事件
            const uniqueOrigins = new Set();
            validUrls.forEach(url => {
                try {
                    const origin = new URL(url).origin;
                    uniqueOrigins.add(origin);
                } catch {
                    // ignore invalid URLs
                }
            });
            
            uniqueOrigins.forEach(origin => {
                window.dispatchEvent(new CustomEvent('faviconRefreshed', {
                    detail: { origin }
                }));
            });
        } catch (error) {
            console.error('[PreferencesLink] Batch fetch icons error', error);
            tools.messageApi?.open({
                type: 'error',
                content: '批量获取图标时发生错误',
                duration: 3,
            });
        }
    }, [tools]);

    const handleBatchFetchClick = React.useCallback(() => {
        Modal.confirm({
            title: '确认批量获取图标？',
            icon: <ExclamationCircleOutlined />,
            content: '此操作将重新获取所有抽屉链接的图标，可能需要较长时间。是否继续？',
            okText: '确认',
            okType: 'primary',
            cancelText: '取消',
            onOk: () => {
                // 立即关闭弹窗，后台执行任务
                handleBatchFetchIcons();
                return Promise.resolve();
            },
        });
    }, [handleBatchFetchIcons]);
    return (
        <Form
            name="basic"
            layout="vertical"
            initialValues={{
                linkSpan,
                copyClose,
                defaultOpenAdd,
                defauiltLink,
                linkOpenSelf,
                showLinkNav,
                homeLinkMaxNum,
                rollingBack
            }}
            onValuesChange={handleChange}
        >
            <Form.Item label="每行展示链接数" name='linkSpan' >
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={options}
                />
            </Form.Item>
            <Divider />
            <Form.Item label="首屏快捷链接最大行数" name='homeLinkMaxNum'>
                <Select
                    size="large"
                    style={{ width: '100%' }}
                    options={homeLinkMaxNumOption}
                />
            </Form.Item>
            <Divider />

            <Form.Item name='defaultOpenAdd' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox>默认打开新增列表</Checkbox>
            </Form.Item>
            {/* <Divider /> */}
            <Form.Item name='copyClose' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >新增链接后关闭页面</Checkbox>
            </Form.Item>
            {/* <Divider /> */}
            <Form.Item name='defauiltLink' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >默认展示抽屉</Checkbox>
            </Form.Item>
            {/* <Divider /> */}
            <Form.Item name='linkOpenSelf' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >链接在新标签页中打开</Checkbox>
            </Form.Item>
            <Form.Item name='showLinkNav' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >在页脚里显示导航</Checkbox>
            </Form.Item>
            <Form.Item name='rollingBack' valuePropName="checked" style={{ marginBottom: 5 }}>
                <Checkbox >支持滚动返回首屏</Checkbox>
            </Form.Item>
            <Divider />
            <div style={{ marginBottom: 20 }}>
                <Typography.Text strong>暗格唤出按键</Typography.Text>
                <Typography.Paragraph type="secondary" style={{ margin: "8px 0 10px" }}>
                    暗格只在界面隐藏，数据仍可通过导出、WebDAV 和浏览器存储访问，不能用来保护隐私。返回首屏时暗格会重新隐藏。
                </Typography.Paragraph>
                {!verifiedShortcut ? (
                    <>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>先依次输入现有按键，验证后才能修改或恢复默认。</Typography.Paragraph>
                        <Input
                            ref={verifyInput}
                            readOnly
                            value={"●".repeat(enteredKeyCount)}
                            placeholder="输入现有暗格按键顺序"
                            onKeyDown={verifyShortcutKey}
                            aria-label="输入现有暗格按键顺序以解锁设置"
                        />
                        <Typography.Paragraph type="secondary" style={{ margin: "6px 0 0" }}>
                            支持字母、数字和方向键；退格删除，Esc 清空。忘记按键后，此处无法修改或恢复默认。
                        </Typography.Paragraph>
                    </>
                ) : recording ? (
                    <>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>验证通过。请录制新的按键顺序：</Typography.Paragraph>
                        <Input
                            ref={shortcutInput}
                            readOnly
                            value={formatShortcut(draftShortcut)}
                            placeholder="依次按键，支持字母、数字和方向键"
                            onKeyDown={recordShortcutKey}
                            aria-label="录制新的暗格按键顺序"
                        />
                        <Typography.Paragraph type="secondary" style={{ margin: "6px 0 10px" }}>
                            录制 2～16 个键；退格删除上一个，Esc 取消。保存前请记住，新按键保存后无法在设置中查看。
                        </Typography.Paragraph>
                        <Space>
                            <Button type="primary" disabled={draftShortcut.length < 2} loading={savingShortcut} onClick={() => confirmShortcutSave(draftShortcut)}>保存按键</Button>
                            <Button onClick={() => setRecording(false)}>取消</Button>
                        </Space>
                    </>
                ) : (
                    <>
                        <Typography.Paragraph style={{ marginBottom: 8 }}>验证通过。当前按键不会显示；保存新按键后需重新验证。</Typography.Paragraph>
                        <Space>
                            <Button onClick={startShortcutRecording}>录制新按键</Button>
                            <Button disabled={savingShortcut || JSON.stringify(currentShortcut) === JSON.stringify(DEFAULT_HIDDEN_SHORTCUT)} onClick={() => confirmShortcutSave([...DEFAULT_HIDDEN_SHORTCUT])}>恢复默认</Button>
                        </Space>
                    </>
                )}
            </div>
            <Divider />
            <Form.Item>
                <Button 
                    type="default" 
                    block 
                    onClick={handleBatchFetchClick}
                    style={{ marginTop: 8 }}
                >
                    获取全部抽屉图标
                </Button>
            </Form.Item>
        </Form>
    );
};
export default observer(PreferencesLink);
