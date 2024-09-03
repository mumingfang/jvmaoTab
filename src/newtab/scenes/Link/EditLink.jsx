import React from "react";
import { observer } from "mobx-react";
import { Button, Spin, Form, Input } from "antd";
import useStores from "~/hooks/useStores";

const EditLink = (props) => {
  const { link, tools } = useStores();
  const { timeKey, linkId, modalTitle = "编辑链接", cb = () => { }, isLink = false } = props;
  const [loading, setLoading] = React.useState(true);
  const [id, setId] = React.useState(linkId);


  const get_id = React.useCallback(() => {
    if (!id) {
      link
        .getLinkByTimeKey(timeKey)
        .then((res) => {
          if (res.linkId) {
            setId(res.linkId);
            setLoading(false);
          } else {
            tools.error("没有找到链接");
            tools.closePublicModal();
          }
        })
    } else {
      setLoading(false);
    }
  }, [id])

  const onFinish = React.useCallback((values) => {
    console.log("Success:", timeKey, linkId);
    link
      .updateLink([
        {
          title: values.title,
          url: values.url,
          timeKey: timeKey,
          linkId: id,
        },
      ])
      .then((res) => {
        tools.closePublicModal();
        link.updateCacheLinkByTimeKey(timeKey, values.title, values.url);

        setTimeout(() => {
          link.setCache();
          cb();
        }, 0);
      })
      .catch((res) => {
        tools.error("失败");
      });
  }, [timeKey, id]);

  React.useEffect(() => {
    if (isLink) {
      get_id();
    } else {
      setLoading(false);
    }
  }, [isLink])

  return (
    <>
      <h2 className="modal-title">{modalTitle}</h2>
      {loading ? (
        <Spin />
      ) : (
        <Form
          name="edit-link"
          layout="vertical"
          initialValues={{
            title: props.title,
            url: props.url,
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="名称"
            name="title"
            rules={[
              {
                required: true,
                message: "名称不能为空",
              },
            ]}
          >
            <Input size="large" />
          </Form.Item>
          {id && props.url ? (
            <Form.Item
              label="网址"
              name="url"
              rules={[
                {
                  required: true,
                  message: "网址不能为空",
                },
              ]}
            >
              <Input size="large" />
            </Form.Item>
          ) : null}
          <Form.Item
            style={{
              display: "flex",
              justifyContent: "flex-end",
              margin: "20px 0 0",
            }}
          >
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Form.Item>
        </Form>
      )
      }

    </>
  );
};
export default observer(EditLink);
