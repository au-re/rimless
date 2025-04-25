import {
  extractMethods,
  generateId,
  getOriginFromURL,
  isNodeEnv,
  addEventListener,
  removeEventListener,
  isNodeWorker,
  NodeWorker,
  getEventData,
} from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, IConnection, IConnections, ISchema } from "./types";

const connections: IConnections = {};

function isValidTarget(guest: HTMLIFrameElement | Worker | NodeWorker, event: any) {
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
function connect(guest: HTMLIFrameElement | Worker | NodeWorker, schema: ISchema = {}): Promise<IConnection> {
  if (!guest) throw new Error("a target is required");

  const guestIsWorker =
    isNodeWorker(guest) || ((guest as Worker).onerror !== undefined && (guest as Worker).onmessage !== undefined);
  const listeners = guestIsWorker || isNodeEnv() ? guest : window;

  return new Promise((resolve) => {
    const connectionID = generateId();

    // on handshake request
    function handleHandshake(event: any) {
      if (!guestIsWorker && !isNodeEnv() && !isValidTarget(guest, event)) return;

      const eventData = getEventData(event);
      if (eventData?.action !== actions.HANDSHAKE_REQUEST) return;

      // register local methods
      const localMethods = extractMethods(schema);
      const unregisterLocal = registerLocalMethods(
        schema,
        localMethods,
        connectionID,
        guestIsWorker || isNodeEnv() ? (guest as Worker) : undefined,
      );

      // register remote methods
      const { remote, unregisterRemote } = registerRemoteMethods(
        eventData.schema,
        eventData.methods,
        connectionID,
        event,
        guestIsWorker || isNodeEnv() ? (guest as Worker) : undefined,
      );

      const payload = {
        action: actions.HANDSHAKE_REPLY,
        connectionID,
        methods: localMethods,
        schema: JSON.parse(JSON.stringify(schema)),
      };

      // confirm the connection
      if (guestIsWorker) (guest as Worker).postMessage(payload);
      else event.source.postMessage(payload, event.origin);

      // close the connection and all listeners when called
      const close = () => {
        removeEventListener(listeners, events.MESSAGE, handleHandshake);
        unregisterRemote();
        unregisterLocal();
        if (guestIsWorker) {
          (guest as Worker).terminate();
        }
      };

      const connection: IConnection = { remote, close };
      connections[connectionID] = connection;
    }

    // subscribe to HANDSHAKE MESSAGES
    addEventListener(listeners, events.MESSAGE, handleHandshake);

    // on handshake reply
    function handleHandshakeReply(event: any) {
      const eventData = getEventData(event);
      if (eventData?.action !== actions.HANDSHAKE_REPLY) return;
      return resolve(connections[eventData.connectionID]);
    }

    addEventListener(listeners, events.MESSAGE, handleHandshakeReply);
  });
}

export default {
  connect,
};
