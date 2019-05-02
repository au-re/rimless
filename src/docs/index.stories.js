import React from 'react';
import { host } from "../index";
import { storiesOf } from '@storybook/react';

const srcDoc = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>guest page</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body>
  <script>
    console.log("CHILD ALIVE");

    window.addEventListener("message", (event) => {
      console.log("CHILD RECEIVE SOURCE", event.source);
      console.log("CHILD RECEIVE ORIGIN", event.origin);
      console.log("CHILD RECEIVE DATA", event.data);
    });

    window.parent.postMessage({
      action: "RIMLESS/HANDSHAKE_REQUEST",
      schema: {
        "foo": "bar",
        "run": (x) => \`Hello host! \${x}\`,
      },
    });
  </script>
</body>

</html>
`;

function Demo() {
  const iframe = React.useRef(null);
  const [childAPI, setChildAPI] = React.useState({});

  React.useEffect(() => {
    async function run() {
      const connection = await host.connect(iframe.current, { test: "hello world" });
      setChildAPI(connection);
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


storiesOf('Rimless', module)
  .add('communication', () => <Demo />)
