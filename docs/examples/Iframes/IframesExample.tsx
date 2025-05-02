import React, { useEffect } from "react";
import template from "./iframe.html?raw";

import { host } from "../../../src/index";
import { Connection } from "../../../src/types";

function makeRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function IframesExample() {
  const iframe = React.useRef<HTMLIFrameElement | null>(null);
  const iframe2 = React.useRef<HTMLIFrameElement | null>(null);
  const [color, setColor] = React.useState("#fff");
  const [connection, setConnection] = React.useState<Connection | null>(null);
  const [connection2, setConnection2] = React.useState<Connection | null>(null);

  useEffect(() => {
    if (!iframe.current || !iframe2.current) return;

    let conn1: Connection | null = null;
    let conn2: Connection | null = null;
    let cancelled = false;

    (async () => {
      conn1 = await host.connect(iframe.current!, { setColor });
      if (cancelled) {
        conn1.close();
        return;
      }
      setConnection(conn1);

      conn2 = await host.connect(iframe2.current!, { setColor });
      if (cancelled) {
        conn2.close();
        return;
      }
      setConnection2(conn2);
    })();

    return () => {
      cancelled = true;
      conn1?.close();
      conn2?.close();
    };
  }, [iframe, iframe2]);

  return (
    <div style={{ background: color }}>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        {connection && connection2 ? <div>Connected</div> : <div>Connecting...</div>}
        <button
          type="button"
          onClick={() => {
            connection?.remote.setColor(makeRandomColor());
            connection2?.remote.setColor(makeRandomColor());
          }}
        >
          call iframe functions
        </button>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <iframe
          style={{
            height: "240px",
            width: "240px",
            border: "1px solid #FFF",
          }}
          title="guest1"
          ref={iframe}
          srcDoc={template}
          sandbox="allow-same-origin allow-scripts"
        />
        <iframe
          style={{
            height: "240px",
            width: "240px",
            border: "1px solid #FFF",
          }}
          title="guest2"
          ref={iframe2}
          srcDoc={template}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

export default IframesExample;
