import React from "react";
import template from "./iframe.html?raw";

import { host } from "../../src/index";
import { IConnection } from "../../src/types";

function makeRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function SingleIframeExample() {
  const iframe = React.useRef<HTMLIFrameElement | null>(null);
  const [color, setColor] = React.useState("#fff");
  const [connection, setConnection] = React.useState<IConnection | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!iframe?.current) return;
      const newConnection = await host.connect(iframe.current, {
        setColor,
      });
      setConnection(newConnection);
    })();
  }, [iframe.current]);

  return (
    <div style={{ background: color }}>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        {connection ? <div>Connected</div> : <div>Connecting...</div>}
        <button
          type="button"
          onClick={() => {
            console.log(connection);
            connection?.remote.setColor(makeRandomColor());
          }}
        >
          call iframe function
        </button>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <iframe
          style={{
            height: "240px",
            width: "240px",
            border: "1px solid #FFF",
          }}
          title="guest"
          ref={iframe}
          srcDoc={template}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

export default SingleIframeExample;
