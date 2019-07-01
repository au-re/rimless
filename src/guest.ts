import { extractMethods, isWorker } from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, ISchema } from "./types";

function connect(schema: ISchema = {}, options: any = {}) {
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

    // publish the HANDSHAKE REQUEST
    if (isWorker()) (self as any).postMessage(payload);
    else window.parent.postMessage(payload, "*");
  });
}

export default ({
  connect,
});
