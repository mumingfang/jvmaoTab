import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Fade = styled.span`
  animation: ${fadeIn} ${(props) => props.timing || "250ms"} ease-in-out;
`;

export default Fade;
