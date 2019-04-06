import { IRPCRequestPayload, IRPCResolvePayload, ISchema, events } from "./types";

export const CONNECTION_TIMEOUT = 1000;

function isTrustedRemote(event: any) {
  return true;
}

/**
 * for each function in the schema subscribe to an event that the remote can call
 *
 * @param schema
 */
export function registerLocalAPI(schema: ISchema, _connectionID: string): any[] {
  const listeners: any[] = [];
  Object.keys(schema)
    .filter((key) => typeof schema[key] === "function")
    .forEach((key) => {

      // handle a remote calling a function on the local API
      async function handleCall(event: any) {
        const { callID, connectionID, callName, args } = event.data as IRPCRequestPayload;

        if (!isTrustedRemote(event)) return;
        if (!callID || !callName) return;
        if (callName !== key) return;
        if (connectionID !== _connectionID) return;

        // TODO: remove listener here?

        // run function and return the results to the remote
        try {
          const result = await schema[key](...args);
          event.source.postMessage({
            action: events.RPC_RESOLVE,
            result,
            callID,
            callName,
            connectionID
          });
        } catch (error) {
          event.source.postMessage({
            action: events.RPC_REJECT,
            error,
            callID,
            callName,
            connectionID
          });
        }
      }

      // subscribe to the call event
      window.addEventListener(events.MESSAGE, handleCall);
      listeners.push(() => window.removeEventListener(events.MESSAGE, handleCall));
    });

  return listeners;
}

export function registerRemoteAPI(schema: ISchema, _connectionID: string, remote: any) {
  const connection: ISchema = {};
  Object.keys(schema)
    .forEach((key) => {
      if (typeof schema[key] !== "function") {
        connection[key] = schema[key];
        return;
      }

      const procedure = createRPC(key, _connectionID, remote);
      connection[key] = procedure;
    });

  return connection;
}

export function createRPC(_callName: string, _connectionID: string, remote: any) {
  return (...args: any) => {
    return new Promise((resolve, reject) => {
      const callID = generateID();

      function handleResponse(event: any) {
        const { callID, connectionID, callName, result, error, action } = event.data as IRPCResolvePayload;

        if (!isTrustedRemote(event)) return;
        if (!callID || !callName) return;
        if (callName !== _callName) return;
        if (connectionID !== _connectionID) return;

        // TODO: remove listener here?

        // resolve the response
        if (action === events.RPC_RESOLVE) return resolve(result);
        if (action === events.RPC_REJECT) return reject(error);
      }

      // send the RPC request with arguments
      const payload = {
        action: events.RPC_REQUEST,
        connectionID: _connectionID,
        callID,
        callName: _callName,
        args
      };

      window.addEventListener(events.MESSAGE, handleResponse);
      remote.postMessage(payload, remote.origin);
    });
  }
}

export function generateID(): string {
  return "1";
}

const urlRegex = /^(https?:|file:)?\/\/([^/:]+)?(:(\d+))?/;
const ports: any = {
  "http:": "80",
  "https:": "443"
};

export function getOriginFromURL(url: string | null) {

  const location = document.location;

  const regexResult = urlRegex.exec(url || "");
  let protocol;
  let hostname;
  let port;

  if (regexResult) {
    // It's an absolute URL. Use the parsed info.
    // regexResult[1] will be undefined if the URL starts with //
    protocol = regexResult[1] ? regexResult[1] : location.protocol;
    hostname = regexResult[2];
    port = regexResult[4];
  } else {
    // It's a relative path. Use the current location's info.
    protocol = location.protocol;
    hostname = location.hostname;
    port = location.port;
  }

  // If the protocol is file, the origin is "null"
  // The origin of a document with file protocol is an opaque origin
  // and its serialization "null" [1]
  // [1] https://html.spec.whatwg.org/multipage/origin.html#origin
  if (protocol === "file:") {
    return "null";
  }

  // If the port is the default for the protocol, we don't want to add it to the origin string
  // or it won't match the message's event.origin.
  const portSuffix = port && port !== ports[protocol] ? `:${port}` : '';
  return `${protocol}//${hostname}${portSuffix}`;
};
