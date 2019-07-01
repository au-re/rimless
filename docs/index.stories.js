import React from "react";
import { storiesOf } from "@storybook/react";
import styled from "styled-components";

import { host } from "../src/index";

const Background = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 42rem;
  margin: 0 auto;
  padding: 1rem;
  font-family: Oswald, sans-serif;

  button {
    width: 120px;
  }
`;

const Iframe = styled.iframe`
  height: 240px;
  width: 240px;
  border: none;
`;

function makeRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function Demo() {
  const iframe = React.useRef(null);
  const [color, setColor] = React.useState();
  const [connection, setConnection] = React.useState();

  React.useEffect(() => {
    (async function () {
      const _connection = await host.connect(iframe.current, {
        setColor,
      });
      setConnection(_connection);
    }());
  }, []);

  return (
    <Background style={{ background: color }}>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        <button onClick={() => connection.remote.setColor(makeRandomColor())}>
          call guest
      </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Iframe
          title="guest"
          ref={iframe}
          src={"https://00e9e64bac85acda98b82d68ccede57e067b66fbc887f0a607-apidata.googleusercontent.com/download/storage/v1/b/m.au-re.com/o/static%2Findex.html?qk=AD5uMEurXomP7BgZon0__ANdACO9tcxGByL7My8uykrFpdSbJ8grwi_7-A4PRHCaY2rY5xQ8I3LyrFU4vm37Io7W1XcXej9vl3_M7kf_u1WTsrOOWiaWBx2Dgin94EW5lK5jDCyIt03pqv8OaLuCJpOvJp8ufBHl9oJCOoB8m8XKMUG1fqqXhs2Gh3Zu8ZcyV0SgdkTNJ5Tiu2aS6bpJAYcruxqjxA63WIVcHiPtc_O8fro2FjJTi3rz70Vlh2BuIFP4kUDX7S9f0VcvA7_F7cuUuCo2EutoQ1ScFNmhg9Iw-udYjFTpL3U7LxD3yH20u9do7uZZ5pqc9J1-jzPJPYnZRLeCaftZDxUTv_m2PeGIwOwxGeUBCfW9Y_x4TW_6Lj39lOx9aLpOno3vipGoh0J2GTW6ZCUsYXXnxhGOfTlW5jKaiwPxS7lTooV5KZP7-VJQ5j3EnGNQElOrJlUUgCnLM6RU8DiripyoeIm_WgZI6GavdK630nILsaOWVKfrglNV2ughNZ-s-ayh-ARYU_jtT1q8THiae0ViV3vrCQjkvH-9zC2l3AfwdwlM8IvDIaVOYfWOBbRh9eKir-hilQTXlZWf0JpY_E8BYlnVl8bgFg-e8zKtUAqFtBBKYUBV0OV3_9xvgTjDlmkG-G4XQisHWBlneehJsLWjzfKt5wHgPCivpHWb40LUwlwjL8hRhWYAccK6fTqcafgGzaH9q46fI8hj4Pko_wQ2TFioTPreyyoHQKXkVskIb3FRmaVlSKAOL7H_hrjL8tPtuZGdHC9qIvhPxuT_bg"}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </Background>);
}

storiesOf("rimless", module)
  .add("iframe communication", () => <Demo />)
