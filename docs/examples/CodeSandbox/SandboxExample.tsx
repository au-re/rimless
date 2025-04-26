import React, { useEffect } from "react";

import { host, IConnection } from "../../../src/index";
import Worker from "./sandbox?worker";

function SandboxExample() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [connection, setConnection] = React.useState<IConnection | null>(null);

  useEffect(() => {
    const api = {
      doSomething: async ({ msg }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "You sent me: " + msg;
      },
    };
    const worker = new Worker();
    host.connect(worker, api).then((_connection) => {
      setConnection(_connection);
    });
  }, []);

  const onClick = async () => {
    if (!connection) return;

    const messageRes = await connection?.remote.execute({
      code: `
        console.log("Running the sandbox...");

        async function main() {
          const res = await Promise.all([
            doSomething({ msg: "1st" }),
            doSomething({ msg: "2nd" }),
          ]);

          const res3 = await doSomething({ msg: "3rd" });

          return [...res, res3];
        }

        main();
      `,
    });

    setMessage(JSON.stringify(messageRes));
  };

  return (
    <div>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        <button type="button" onClick={onClick}>
          run code
        </button>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default SandboxExample;
