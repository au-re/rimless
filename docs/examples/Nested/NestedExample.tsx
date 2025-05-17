import React, { useEffect } from "react";

import { host, Connection } from "../../../src/index";
import Worker from "./worker?worker";

function NestedExample() {
  const [profile, setProfile] = React.useState<any | null>(null);
  const [connection, setConnection] = React.useState<Connection | null>(null);

  useEffect(() => {
    const options = { getHostMessage: () => "Hello from host" };
    const worker = new Worker();
    host.connect(worker, options).then(setConnection);
  }, []);

  const fetchProfile = async () => {
    if (!connection) return;

    const res = await connection.remote.user.profile.get();
    setProfile(res);
  };

  return (
    <div>
      <h1>Nested API Demo</h1>
      <button type="button" onClick={fetchProfile}>
        load profile
      </button>
      {profile && <pre>{JSON.stringify(profile)}</pre>}
    </div>
  );
}

export default NestedExample;
