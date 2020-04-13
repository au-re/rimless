import React from "react";
import { Background, Iframe } from "./Components";

import { host } from "../../src/index";

function makeRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function SingleIframeExample() {
  const iframe = React.useRef(null);
  const [color, setColor] = React.useState(null);
  const [connection, setConnection] = React.useState(null);

  React.useEffect(() => {
    if (!iframe.current) return;
    (async () => {
      const newConnection = await host.connect(iframe.current, {
        setColor,
      });
      setConnection(newConnection);
    })();
  }, [iframe.current]);

  return (
    <Background style={{ background: color }}>

      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        <button type="button" onClick={() => connection.remote.setColor(makeRandomColor())}>
          call iframe function
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Iframe
          title="guest"
          ref={iframe}
          src="https://au-re.com/rimless/index.html"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </Background>
  );
}

export default SingleIframeExample;
