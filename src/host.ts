import short from "short-uuid";

import { getOriginFromURL } from "./helpers";
import { registerLocalAPI, registerRemoteAPI } from "./rpc";
import { actions, events, IConnections, ISchema } from "./types";

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
 * @param options
 * @returns Promise
 */
function connect(iframe: HTMLIFrameElement, schema: ISchema, options?: any) {
  if (!iframe) throw new Error("a target iframe is required");

  return new Promise((resolve, reject) => {
    const connectionID = short.generate();

    // on handshake request
    function handleHandshake(event: any) {

      if (!isValidTarget(iframe, event)) return;
      if (event.data.action !== actions.HANDSHAKE_REQUEST) return;

      // register local and remote APIs
      registerLocalAPI(schema, connectionID);
      const connection = registerRemoteAPI(event.data.schema, connectionID, event.source);
      connections[connectionID] = connection;

      // confirm the connection
      event.source.postMessage({ action: actions.HANDSHAKE_REPLY, schema, connectionID }, event.origin);
      return resolve(connection);
    }

    // subscribe to HANDSHAKE MESSAGES
    window.addEventListener(events.MESSAGE, handleHandshake);
  });
}

export default ({
  connect,
});
