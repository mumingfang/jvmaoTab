import React from 'react';
import { observer } from 'mobx-react';
import { Alert, Button, Modal, Space } from 'antd';
import useStores from '~/hooks/useStores';

const WebdavConflictModal = () => {
  const { data, tools } = useStores();
  const conflict = data.syncConflict;
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(null);

  React.useEffect(() => setDismissed(false), [conflict?.id]);

  const resolve = async (choice) => {
    setBusy(choice);
    try {
      await data.resolveConflict(choice);
    } catch (error) {
      tools.error(`处理同步冲突失败: ${error.message || '未知错误'}`);
    } finally {
      setBusy(null);
    }
  };

  if (!conflict) return null;

  return <>
    {dismissed && <div role="alert" style={{ position: 'fixed', right: 20, bottom: 24, zIndex: 1001 }}>
      <Button type="primary" danger onClick={() => setDismissed(false)}>WebDAV 同步已暂停 · 处理冲突</Button>
    </div>}
    <Modal
      title="选择要保留的同步数据"
      open={!dismissed}
      onCancel={() => setDismissed(true)}
      maskClosable={false}
      footer={<Space wrap>
        <Button onClick={() => setDismissed(true)} disabled={!!busy}>稍后处理</Button>
        <Button onClick={() => resolve('retry')} loading={busy === 'retry'} disabled={!!busy && busy !== 'retry'}>重新检查</Button>
        <Button onClick={() => resolve('remote')} loading={busy === 'remote'} disabled={!!busy && busy !== 'remote'}>使用远端</Button>
        <Button type="primary" danger onClick={() => resolve('local')}
          loading={busy === 'local'} disabled={conflict.localIsBootstrap || (!!busy && busy !== 'local')}>使用本地</Button>
      </Space>}
    >
      <Alert type="warning" showIcon message="远端 JSON 的版本与独立版本文件不一致，同步已暂停。请选择要保留的数据。" />
      <p>远端数据：版本 {conflict.snapshotVersion}，{conflict.remoteLinks} 条链接，{conflict.remoteNotes} 条便签，{(conflict.remoteSize / 1024).toFixed(1)} KB。</p>
      <p>远端版本文件：{conflict.remoteVersion}。</p>
      <p>本地数据：版本 {conflict.localVersion}，{conflict.localLinks} 条链接，{conflict.localNotes} 条便签。</p>
      <p>使用远端前会在本机备份当前数据；使用本地前会在 WebDAV 中另存远端数据，并重新核对远端状态。处理期间若数据变化，会要求重新选择。</p>
      {conflict.localIsBootstrap && <p>本地是初始空白数据，不能用它覆盖远端。</p>}
    </Modal>
  </>;
};

export default observer(WebdavConflictModal);
