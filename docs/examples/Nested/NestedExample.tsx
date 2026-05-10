import React, { useEffect } from "react";

import { type Connection, host } from "../../../src/index";
import Worker from "./worker?worker";

function NestedExample() {
  const [profile, setProfile] = React.useState<any | null>(null);
  const [connection, setConnection] = React.useState<Connection | null>(null);

  useEffect(() => {
    const worker = new Worker();
    let activeConnection: Connection | null = null;
    let disposed = false;

    host
      .connect(worker)
      .then((nextConnection) => {
        if (disposed) {
          nextConnection.close();
          return;
        }

        activeConnection = nextConnection;
        setConnection(nextConnection);
      })
      .catch((error) => {
        console.error("Error connecting to nested API worker", error);
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

  const fetchProfile = async () => {
    if (!connection) return;

    const res = await connection.remote.user.profile.get();
    setProfile(res);
  };

  return (
    <div>
      <h1>Nested API Demo</h1>
      <button type="button" onClick={fetchProfile} disabled={!connection}>
        load profile
      </button>
      {profile && <pre>{JSON.stringify(profile)}</pre>}
    </div>
  );
}

export default NestedExample;
