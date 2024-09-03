import React from "react";
import { Button, Result, ConfigProvider, Popconfirm } from "antd";
import styled from "styled-components";
import { ErrorBoundary } from "react-error-boundary";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import logoPng from "~/assets/logo.png";


const ErrWap = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding-block-start: 16vh;
  svg {
    color: red;
  }
`;

const Pre = styled.pre`
  padding: 0;
  font-size: 12px;
  white-space: pre-wrap;
  border: none;
`;

const ChiefSecurityAssurance = ({ children }) => {
  const { option, tools } = useStores();
  const [showErr, setShowErr] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback(() => {
    setLoading(true);
    option.resetOption();
  }, []);

  return (
    <ErrorBoundary fallbackRender={({ error }) => (
      <ErrWap>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#e06400',
            },
          }}
        >
          <Result
            status="error"
            title="我们用这个界面来遮盖已经崩溃的页面"
            subTitle="发生这样的事情通常都是因为不可抗拒的因素导致的, 请尝试刷新页面。或者你也可以点击错误信息然后把它截图发给我们"
            icon={<img style={{ height: "100px", width: "100px" }} src={logoPng} alt="橘猫起始页" />}
            extra={[
              <Button type="primary" onClick={() => window.location.reload()}>
                刷新页面
              </Button>,
              <Button key="buy" onClick={() => setShowErr(true)}>
                错误信息
              </Button>,
              <Popconfirm
                title="即将重置选项"
                description="即将重置选项，上传的自定义壁纸会被清空。(仅设置项会被重置，其他数据会被保留)"
                onConfirm={confirm}
                okText="确定"
                cancelText="取消"
              >
                <Button danger loading={loading}>重置设置</Button>
              </Popconfirm>,
              <Button key="export" danger onClick={tools.onExport}>
                数据导出
              </Button>,
            ]}
          >
            {showErr ? (
              <div className="desc">
                <Pre>{error.toString()}</Pre>
              </div>
            ) : null}
          </Result>
        </ConfigProvider>
      </ErrWap>
    )}>
      <>{!option.isResetOption ? children : null}</>
    </ErrorBoundary>
  )

};

export default observer(ChiefSecurityAssurance);
