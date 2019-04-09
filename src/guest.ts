import { extractMethods } from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, ISchema } from "./types";

function connect(schema: ISchema, options?: any) {
  return new Promise((resolve, reject) => {

    const localMethods = extractMethods(schema);

    // on handshake response
    function handleHandshakeResponse(event: any) {
      if (event.data.action !== actions.HANDSHAKE_REPLY) return;

      // TODO: extract methods from schema
      const methods = extractMethods(schema);

      // register local methods
      const unregisterLocal = registerLocalMethods(schema, localMethods, event.data.connectionID);

      // register remote methods
      const { remote, unregisterRemote } =
        registerRemoteMethods(event.data.schema, event.data.methods, event.data.connectionID, event.source);

      // close the connection and all listeners when called
      const close = () => {
        window.removeEventListener(events.MESSAGE, handleHandshakeResponse);
        unregisterRemote();
        unregisterLocal();
      };

      // resolve connection object
      const connection = { remote, close };
      return resolve(connection);
    }

    // subscribe to HANDSHAKE REPLY MESSAGES
    window.addEventListener(events.MESSAGE, handleHandshakeResponse);
    window.parent.postMessage({
      action: actions.HANDSHAKE_REQUEST,
      methods: localMethods,
      schema: JSON.parse(JSON.stringify(schema)),
    }, "*");
  });
}

export default ({
  connect,
});
