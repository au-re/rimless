import React, { useEffect } from "react";

import { type Connection, host } from "../../../src/index";
import Worker from "./worker?worker";

function WorkerExample() {
  const [color, setColor] = React.useState("#fff");
  const [message, setMessage] = React.useState("");
  const [connection, setConnection] = React.useState<Connection | null>(null);

  useEffect(() => {
    const options = { initialValue: "initial value from host", getHostMessage: () => "Hello from host!" };
    const worker = new Worker();
    let activeConnection: Connection | null = null;
    let disposed = false;

    host
      .connect(worker, options)
      .then((nextConnection) => {
        if (disposed) {
          nextConnection.close();
          return;
        }

        activeConnection = nextConnection;
        setConnection(nextConnection);
      })
      .catch((error) => {
        console.error("Error connecting to worker", error);
        worker.terminate();
      });

    return () => {
      disposed = true;
      activeConnection?.close();
      if (!activeConnection) {
        worker.terminate();
      }
    };
  }, []);

  const onClick = async () => {
    if (!connection) return;

    const messageRes = await connection?.remote.getMessage();
    setMessage(messageRes);

    const colorRes = await connection?.remote.createColor();
    setColor(colorRes);
  };

  return (
    <div style={{ background: color }}>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        <button type="button" onClick={onClick} disabled={!connection}>
          call web worker function
        </button>
        <pre>{message}</pre>
      </div>
    </div>
  );
}

export default WorkerExample;
