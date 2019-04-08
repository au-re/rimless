import short from "short-uuid";

import { isTrustedRemote } from "./helpers";
import { actions, events, IRPCRequestPayload, IRPCResolvePayload, ISchema } from "./types";

/**
 * for each function in the schema subscribe to an event that the remote can call
 * listen for calls from the remote. When called execute the function and emit the results.
 *
 * @param schema
 * @param _connectionID
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
            action: actions.RPC_RESOLVE,
            callID,
            callName,
            connectionID,
            result,
          });
        } catch (error) {
          event.source.postMessage({
            action: actions.RPC_REJECT,
            callID,
            callName,
            connectionID,
            error,
          });
        }
      }

      // subscribe to the call event
      window.addEventListener(events.MESSAGE, handleCall);
      listeners.push(() => window.removeEventListener(events.MESSAGE, handleCall));
    });

  return listeners;
}

/**
 * create a connection object from the remote schema. Functions in that object will emit an
 * event to the remote to execute an RPC.
 *
 * @param schema
 * @param _connectionID
 * @param remote
 */
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

/**
 * create a function that will call the remote when invoked with the required arguments
 * listen to the event returned by the remote and resolve the promise
 *
 * @param _callName
 * @param _connectionID
 * @param remote
 */
export function createRPC(_callName: string, _connectionID: string, remote: any) {
  return (...args: any) => {
    return new Promise((resolve, reject) => {
      const callID = short.generate();

      // on RPC response
      function handleResponse(event: any) {
        const { callID, connectionID, callName, result, error, action } = event.data as IRPCResolvePayload;

        if (!isTrustedRemote(event)) return;
        if (!callID || !callName) return;
        if (callName !== _callName) return;
        if (connectionID !== _connectionID) return;

        // TODO: remove listener here?

        // resolve the response
        if (action === actions.RPC_RESOLVE) return resolve(result);
        if (action === actions.RPC_REJECT) return reject(error);
      }

      // send the RPC request with arguments
      const payload = {
        action: actions.RPC_REQUEST,
        args,
        callID,
        callName: _callName,
        connectionID: _connectionID,
      };

      window.addEventListener(events.MESSAGE, handleResponse);
      remote.postMessage(payload, remote.origin);
    });
  };
}
