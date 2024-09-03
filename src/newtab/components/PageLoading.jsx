import React from 'react';
import styled from "styled-components";
import { Spin } from 'antd';
import Fade from "~/components/Fade";

const LoadingWrap = styled.div`
  padding: 20px;
  display: flex;
  text-align: center;
  width: 100%;
  align-items: center;
  justify-content: center;
  > span {
    font-size: 14px;
    color: #999;
  }
`;


function PageLoading() {
  return (
    <Fade timing={500}>
      <LoadingWrap>
        <span> Loading... </span>
      </LoadingWrap>
    </Fade>

  );
}

export default PageLoading;
