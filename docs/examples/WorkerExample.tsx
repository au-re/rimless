import React from "react";

import { host } from "../../src/index";
import Worker from "./worker?worker";

function WorkerExample() {
  const [color, setColor] = React.useState("#fff");
  const [message, setMessage] = React.useState("");

  const onClick = async () => {
    const options = { initialValue: "initial value from host" };
    const connection = await host.connect(new Worker(), options);

    const messageRes = await connection?.remote.getMessage();
    setMessage(messageRes);

    const colorRes = await connection?.remote.createColor();
    setColor(colorRes);
  };

  return (
    <div style={{ background: color }}>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        <button type="button" onClick={onClick}>
          call web worker function
        </button>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default WorkerExample;
