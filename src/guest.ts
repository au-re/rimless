import { extractMethods, isWorker } from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, IConnection, ISchema } from "./types";

const REQUEST_INTERVAL = 600;
const TIMEOUT_INTERVAL = 3000;

let interval: any = null;
let connected = false;

function connect(schema: ISchema = {}, options: any = {}): Promise<IConnection> {
  return new Promise((resolve, reject) => {

    const localMethods = extractMethods(schema);

    // on handshake response
    function handleHandshakeResponse(event: any) {
      if (event.data.action !== actions.HANDSHAKE_REPLY) return;

      // register local methods
      const unregisterLocal = registerLocalMethods(schema, localMethods, event.data.connectionID);

      // register remote methods
      const { remote, unregisterRemote } =
        registerRemoteMethods(event.data.schema, event.data.methods, event.data.connectionID, event);

      // close the connection and all listeners when called
      const close = () => {
        self.removeEventListener(events.MESSAGE, handleHandshakeResponse);
        unregisterRemote();
        unregisterLocal();
      };

      connected = true;

      // resolve connection object
      const connection = { remote, close };
      return resolve(connection);
    }

    // subscribe to HANDSHAKE REPLY MESSAGES
    self.addEventListener(events.MESSAGE, handleHandshakeResponse);

    const payload = {
      action: actions.HANDSHAKE_REQUEST,
      methods: localMethods,
      schema: JSON.parse(JSON.stringify(schema)),
    };

    interval = setInterval(() => {
      if (connected) return clearInterval(interval);

      // publish the HANDSHAKE REQUEST
      if (isWorker()) (self as any).postMessage(payload);
      else window.parent.postMessage(payload, "*");

    }, REQUEST_INTERVAL);

    // timeout the connection after a time
    setTimeout(() => {
      if (!connected) reject("connection timeout");
    }, TIMEOUT_INTERVAL);

  });
}

export default ({
  connect,
});
