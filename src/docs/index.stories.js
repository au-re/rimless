import React from "react";
import { storiesOf } from "@storybook/react";

import { host } from "../index";

const srcDoc = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>guest page</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/rimless@0.0.3/lib/rimless.min.js"></script>
</head>

<body>
  <script>
    const guestId = "foo";
    console.log(rimless);
    const { guest } = rimless;

    async function connect() {
      // returns the host object with the API defined by the host
      const connection = await guest.connect({
        sayHiToHost: (hostId) => "hello host",
      });

      console.log("GUEST CONN", connection);

      // with the host object we can now run actions on the host
      const res = await connection.remote.sayHiToGuest(guestId);
      console.log("GUEST", res); // "hello guest!"
    }

    connect();
  </script>
</body>

</html>
`;

function Demo() {
  const iframe = React.useRef(null);
  const [childAPI, setChildAPI] = React.useState({});

  React.useEffect(() => {
    async function run() {

      // returns the guest object with the API defined by the guest
      const connection = await host.connect(iframe.current, {
        sayHiToGuest: (guestId) => `hello guest ${guestId}!`,
      });

      console.log(connection);

      // with the guest object we can now run actions on the iframe
      const res = await connection.remote.sayHiToHost("bar");
      console.log(res); // hello host bar!

      setChildAPI(connection.remote);

      // close the connection
      connection.close();
    }
    run();
  }, []);

  return (
    <>
      <div>child prop</div>
      <div>{childAPI.childProp}</div>
      <iframe
        title="child"
        ref={iframe}
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-scripts"
      />
    </>);
}

storiesOf("rimless", module)
  .add("communication", () => <Demo />)
