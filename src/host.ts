import {
  addEventListener,
  extractMethods,
  generateId,
  getEventData,
  getOriginFromURL,
  isNodeEnv,
  isNodeWorker,
  isWorkerLike,
  postMessageToTarget,
  removeEventListener,
} from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, Guest, Connection, Connections, Schema } from "./types";

const connections: Connections = {};

function isValidTarget(guest: Guest, event: any) {
  // If it's a worker, we don't need to validate origin
  if (isNodeWorker(guest) || (typeof Worker !== "undefined" && guest instanceof Worker)) {
    return true;
  }

  // For iframes, check origin and source
  const iframe = guest as HTMLIFrameElement;
  try {
    const childURL = iframe.src;
    const childOrigin = getOriginFromURL(childURL);
    const hasProperOrigin = event.origin === childOrigin;
    const hasProperSource = event.source === iframe.contentWindow;

    return (hasProperOrigin && hasProperSource) || !childURL;
  } catch (e) {
    console.warn("Error checking iframe target:", e);
    return false;
  }
}

/**
 * Perform a handshake with the target iframe, when the handshake is confirmed
 * resolve the connection object containing RPCs and properties
 *
 * @param iframe
 * @param schema
 * @returns Promise
 */
function connect(guest: Guest, schema: Schema = {}): Promise<Connection> {
  if (!guest) throw new Error("a target is required");

  const guestIsWorker = isWorkerLike(guest);

  const listenTo = guestIsWorker || isNodeEnv() ? (guest as Worker) : window;

  return new Promise((resolve) => {
    const connectionID = generateId();

    // on handshake request
    function handleHandshake(event: any) {
      const sendTo = guestIsWorker || isNodeEnv() ? (guest as Worker) : event.source;

      if (!guestIsWorker && !isNodeEnv() && !isValidTarget(guest, event)) return;

      const eventData = getEventData(event);
      if (eventData?.action !== actions.HANDSHAKE_REQUEST) return;
      if (connections[connectionID]) return;

      // register local methods
      const localMethods = extractMethods(schema);
      const unregisterLocal = registerLocalMethods(localMethods, connectionID, listenTo, sendTo);

      // register remote methods
      const { remote, unregisterRemote } = registerRemoteMethods(
        eventData.schema,
        eventData.methodNames,
        connectionID,
        event,
        listenTo,
        sendTo
      );

      // send a HANDSHAKE REPLY to the guest
      const payload = {
        action: actions.HANDSHAKE_REPLY,
        connectionID,
        schema: schema,
        methodNames: Object.keys(localMethods),
      };

      postMessageToTarget(sendTo, payload, event.origin);

      // close the connection and all listeners when called
      const close = () => {
        delete connections[connectionID];
        removeEventListener(listenTo, events.MESSAGE, handleHandshake);
        unregisterRemote();
        unregisterLocal();
        if (guestIsWorker) {
          (guest as Worker).terminate();
        }
      };

      const connection: Connection = { remote, close, id: connectionID };
      connections[connectionID] = connection;
    }

    // subscribe to HANDSHAKE MESSAGES
    addEventListener(listenTo, events.MESSAGE, handleHandshake);

    // on handshake reply
    function handleHandshakeReply(event: any) {
      const eventData = getEventData(event);
      if (eventData?.action !== actions.HANDSHAKE_REPLY) return;
      if (connectionID !== eventData.connectionID) return;

      if (!connections[eventData.connectionID]) {
        throw new Error("Rimless Error: No connection found for this connectionID");
      }

      return resolve(connections[eventData.connectionID]);
    }

    addEventListener(listenTo, events.MESSAGE, handleHandshakeReply);
  });
}

export default {
  connect,
};
