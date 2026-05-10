import React, { useEffect } from "react";

import { type Connection, host } from "../../../src/index";
import Worker from "./sandbox?worker";

function SandboxExample() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [connection, setConnection] = React.useState<Connection | null>(null);

  useEffect(() => {
    const api = {
      doSomething: async ({ msg }: { msg: string }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return `You sent me: ${msg}`;
      },
    };
    const worker = new Worker();
    let activeConnection: Connection | null = null;
    let disposed = false;

    host
      .connect(worker, api)
      .then((nextConnection) => {
        if (disposed) {
          nextConnection.close();
          return;
        }

        activeConnection = nextConnection;
        setConnection(nextConnection);
      })
      .catch((error) => {
        console.error("Error connecting to sandbox worker", error);
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

    const messageRes = (await connection.remote.execute({
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

        return main();
      `,
    })) as { result: unknown; error: string | null };

    setMessage(JSON.stringify(messageRes.error ?? messageRes.result, null, 2));
  };

  return (
    <div>
      <div style={{ flex: 1 }}>
        <h1>HOST</h1>
        <button type="button" onClick={onClick} disabled={!connection}>
          run code
        </button>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default SandboxExample;
