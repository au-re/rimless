import { extractMethods, generateId, getOriginFromURL } from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, IConnection, IConnections, ISchema } from "./types";

const connections: IConnections = {};

function isValidTarget(iframe: HTMLIFrameElement, event: any) {
  const childURL = iframe.getAttribute("src");
  const childOrigin = getOriginFromURL(childURL);
  const hasProperOrigin = event.origin === childOrigin;
  const hasProperSource = event.source === iframe.contentWindow;

  return hasProperOrigin && hasProperSource;
}

/**
 * Perform a handshake with the target iframe, when the handshake is confirmed
 * resolve the connection object containing RPCs and properties
 *
 * @param iframe
 * @param schema
 * @returns Promise
 */
function connect(guest: HTMLIFrameElement | Worker, schema: ISchema = {}): Promise<IConnection> {
  if (!guest) throw new Error("a target is required");

  const guestIsWorker = (guest as Worker).onerror !== undefined && (guest as Worker).onmessage !== undefined;
  const listeners = guestIsWorker ? guest : window;

  return new Promise((resolve) => {
    const connectionID = generateId();

    // on handshake request
    function handleHandshake(event: any) {
      if (!guestIsWorker && !isValidTarget(guest as HTMLIFrameElement, event)) return;
      if (event.data.action !== actions.HANDSHAKE_REQUEST) return;

      // register local methods
      const localMethods = extractMethods(schema);
      const unregisterLocal = registerLocalMethods(
        schema,
        localMethods,
        connectionID,
        guestIsWorker ? (guest as Worker) : undefined
      );

      // register remote methods
      const { remote, unregisterRemote } = registerRemoteMethods(
        event.data.schema,
        event.data.methods,
        connectionID,
        event,
        guestIsWorker ? (guest as Worker) : undefined
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
        listeners.removeEventListener(events.MESSAGE, handleHandshake);
        unregisterRemote();
        unregisterLocal();
        if (guestIsWorker) (guest as Worker).terminate();
      };

      const connection: IConnection = { remote, close };
      connections[connectionID] = connection;
    }

    // subscribe to HANDSHAKE MESSAGES
    listeners.addEventListener(events.MESSAGE, handleHandshake);

    // on handshake reply
    function handleHandshakeReply(event: any) {
      if (event.data.action !== actions.HANDSHAKE_REPLY) return;
      return resolve(connections[event.data.connectionID]);
    }

    listeners.addEventListener(events.MESSAGE, handleHandshakeReply);
  });
}

export default {
  connect,
};
