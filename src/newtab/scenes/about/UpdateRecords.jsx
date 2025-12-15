
import React from "react";
import styled from "styled-components";
import updateRecords from "../../../updateRecords";

// import { Modal, Form, Divider } from "antd";

const Wrap = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    h2 {
        margin: 0;
    }
    ul {
        padding-left: 18px;
        flex: 1;
        overflow-y: auto;
    }
`;

const UpdateRecords = () => {
    return (
        <Wrap>
            <h2>更新日志</h2>
            <ul className="scroll-container">
                {updateRecords.map((record, index) => (
                    <li key={index}>
                        <span>{record.version}</span>
                        <ul>
                            {record.items.map((item, itemIndex) => (
                                <li key={itemIndex}>{item}</li>
                            ))}
                    </ul>
                </li>
                ))}
            </ul>
        </Wrap>
    );
};
export default UpdateRecords;
