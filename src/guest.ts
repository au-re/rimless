import {
  extractMethods,
  getEventData,
  getTargetHost,
  postMessageToTarget,
  addEventListener,
  removeEventListener,
} from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, GuestConnectOptions, events, Connection, Schema } from "./types";

function connect(schema: Schema = {}, options?: GuestConnectOptions): Promise<Connection> {
  return new Promise(async (resolve) => {
    const localMethods = extractMethods(schema);
    const sendTo = options?.hostTarget ?? getTargetHost();
    const listenTo = options?.hostTarget ?? (self || window);

    // on handshake response
    async function handleHandshakeResponse(event: any) {
      const eventData = getEventData(event);
      if (eventData?.action !== actions.HANDSHAKE_REPLY) return;

      // register remote methods
      const { remote, unregisterRemote } = registerRemoteMethods(
        eventData.schema,
        eventData.methodNames,
        eventData.connectionID,
        event,
        listenTo,
        sendTo
      );

      // register local methods, passing the remote object
      const unregisterLocal = registerLocalMethods(localMethods, eventData.connectionID, listenTo, sendTo, remote);

      await options?.onConnectionSetup?.(remote);

      // send a HANDSHAKE REPLY to the host
      const payload = {
        action: actions.HANDSHAKE_REPLY,
        connectionID: eventData.connectionID,
      };

      postMessageToTarget(sendTo, payload, event?.origin);

      // close the connection and all listeners when called
      const close = () => {
        removeEventListener(listenTo, events.MESSAGE, handleHandshakeResponse);
        unregisterRemote();
        unregisterLocal();
      };

      // resolve connection object
      const connection = { remote, close, id: eventData.connectionID };
      return resolve(connection);
    }

    // subscribe to HANDSHAKE RESPONSE MESSAGES
    addEventListener(listenTo, events.MESSAGE, handleHandshakeResponse);

    const payload = {
      action: actions.HANDSHAKE_REQUEST,
      methodNames: Object.keys(localMethods),
      schema: schema,
    };

    postMessageToTarget(sendTo, payload);
  });
}

export default {
  connect,
};
