import styled from "styled-components";

export const Background = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem;
  font-family: Oswald, sans-serif;

  button {
    width: 120px;
  }
`;

export const Iframe = styled.iframe`
  height: 240px;
  width: 240px;
  border: 1px solid #FFF;
`;
