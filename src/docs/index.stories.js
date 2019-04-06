import { Button, Welcome } from '@storybook/react/demo';
import { child, parent } from "../index";

import React from 'react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import { storiesOf } from '@storybook/react';

const srcDoc = `
  <!DOCTYPE html>
  <html>

  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Page Title</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>

  <body>
    <script>
      console.log("CHILD ALIVE");
      window.addEventListener("message", (event) => {
        console.log("MESSAGE", event.source);
        console.log("MESSAGE", event.origin);
        console.log("MESSAGE", event.data);
      });
      window.parent.postMessage({ schema: {
        childProp: "test",
        run: (x) => \`some string with \${x}\`

      }, action: "ANCHOR/HANDSHAKE_REQUEST" });
    </script>
  </body>

  </html>
`;

function Demo() {
  const iframe = React.useRef(null);
  const [childAPI, setChildAPI] = React.useState({});

  React.useEffect(() => {
    async function run() {
      const connection = await parent
        .connect(iframe.current, { test: "hello world" });
      console.log("PARENT CONNECTION ESTABLISHED", connection);
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


storiesOf('Anchor', module)
  .add('communication', () => <Demo />)
