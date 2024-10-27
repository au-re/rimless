import { extractMethods, isWorker } from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, EventHandlers, events, IConnection, ISchema } from "./types";

function connect(schema: ISchema = {}, eventHandlers?: EventHandlers): Promise<IConnection> {
  return new Promise((resolve) => {
    const localMethods = extractMethods(schema);

    // on handshake response
    async function handleHandshakeResponse(event: any) {
      if (event.data.action !== actions.HANDSHAKE_REPLY) return;

      // register local methods
      const unregisterLocal = registerLocalMethods(schema, localMethods, event.data.connectionID);

      // register remote methods
      const { remote, unregisterRemote } = registerRemoteMethods(
        event.data.schema,
        event.data.methods,
        event.data.connectionID,
        event
      );

      await eventHandlers?.onConnectionSetup?.(remote);

      // send a HANDSHAKE REPLY to the host
      const payload = {
        action: actions.HANDSHAKE_REPLY,
        connectionID: event.data.connectionID,
      };

      if (isWorker()) self.postMessage(payload);
      else window.parent.postMessage(payload, "*");

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

    if (isWorker()) (self as any).postMessage(payload);
    else window.parent.postMessage(payload, "*");
  });
}

export default {
  connect,
};
