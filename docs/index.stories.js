import React from "react";
import { storiesOf } from "@storybook/react";

import { host } from "../src/index";
import template from "raw-loader!./index.html";

function Demo() {
  const iframe1 = React.useRef(null);
  const iframe2 = React.useRef(null);
  const [message, setMessage] = React.useState("");
  const [childSchema, setChildSchema] = React.useState({});
  const [childMessage, setChildMessage] = React.useState("");

  React.useEffect(() => {
    async function run() {

      // returns the guest object with the API defined by the guest
      const connection = await host.connect(iframe1.current, {
        sendMessage: (message) => {
          setChildMessage(message);
        },
      });

      host.connect(iframe2.current, {
        sendMessage: (message) => {
          setChildMessage(message);
        },
      });

      setChildSchema(connection.remote);
    }
    run();
  }, []);

  return (
    <div>
      <h1>HOST</h1>
      <div>child message: {childMessage}</div>
      <div>child schema:  {Object.keys(childSchema).join(";")}</div>
      <input value={message} onChange={(e) => setMessage(e.target.value)}></input>
      <button onClick={() => childSchema.sendMessage(message)}>call guest</button>

      <iframe
        style={{ border: "1px solid #e2e2e2", height: "250px", width: "100%" }}
        title="child"
        ref={iframe1}
        srcDoc={template}
        sandbox="allow-same-origin allow-scripts"
      />

      <iframe
        style={{ border: "1px solid #e2e2e2", height: "250px", width: "100%" }}
        title="child"
        ref={iframe2}
        srcDoc={template}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>);
}

storiesOf("rimless", module)
  .add("communication", () => <Demo />)
