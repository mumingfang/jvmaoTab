import React from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { Modal } from "antd";
import { useEventEmitter, useMemoizedFn } from "ahooks";
import PageLoading from "~/components/PageLoading";

const EditLink = React.lazy(() => import("~/scenes/Link/EditLink"));
// const About = React.lazy(() => import("~/scenes/about/About"));
const Manual = React.lazy(() => import("~/scenes/manual"));
const MoveGroup = React.lazy(() => import("~/scenes/Link/MoveGroup"));

function PublicModal() {
  const { tools, create } = useStores();
  const [open, setOpen] = React.useState(false);
  const [activeCom, setActiveCom] = React.useState(null);
  const [comProps, setComProps] = React.useState({});
  const [modalWidth, setWidth] = React.useState(500);
  const [title, setTitle] = React.useState("");

  const openPublicModalEvent$ = useEventEmitter();

  openPublicModalEvent$.useSubscription((props) => {
    const { type, data, width, title } = props;
    if (type === "close") {
      setOpen(false);
      setActiveCom(null);
      setComProps({});
      setTitle("");
    } else {
      setWidth(width);
      setActiveCom(type);
      setOpen(true);
      setComProps(data);
      setTitle(title);
    }
  });

  const handleClose = useMemoizedFn(() => {
    switch (activeCom) {
      default:
        setOpen(false);
        if (comProps.onClose) {
          comProps.onClose();
        }
        break;
    }
  }, [activeCom, comProps]);

  const modalComponent = useMemoizedFn(() => {
    switch (activeCom) {
      case "EditLink":
        return <EditLink {...comProps} />;
      case "MoveGroup":
        return <MoveGroup {...comProps} />;
      case "Manual":
        return <Manual {...comProps} />;
      default:
        return null;
    }
  }, [activeCom, comProps]);

  React.useEffect(() => {
    tools.setOpenPublicModalEvent(openPublicModalEvent$);
  }, []);

  return (
    <Modal
      centered
      open={open}
      onCancel={handleClose}
      wrapClassName={`my-modal ${activeCom}-modal`}
      footer={null}
      destroyOnClose={true}
      width={modalWidth}
      title={title}
      maskStyle={
        {
          backdropFilter: "saturate(180%) blur(20px)",
        }
      }
    >
      <React.Suspense fallback={<PageLoading />}>
        {modalComponent()}
      </React.Suspense>
    </Modal>
  );
}

export default observer(PublicModal);
