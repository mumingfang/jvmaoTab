import React from "react";
import { Col, Row } from "antd";
import { observer } from "mobx-react";
import styled from "styled-components";
import LinkPanel from "~/scenes/Link/LinkPanel";

const Warp = styled.div`
  padding: 20px;
`;

const LinkHome = (props) => {
  const ref = React.useRef(null);
  return (
    <Warp ref={ref}>
      <LinkPanel warpRef={ref} />
    </Warp>
  );
};

export default observer(LinkHome);
