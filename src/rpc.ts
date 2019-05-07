import get from "lodash.get";
import set from "lodash.set";
import short from "short-uuid";

import { isTrustedRemote } from "./helpers";
import { actions, events, IRPCRequestPayload, IRPCResolvePayload, ISchema } from "./types";

/**
 * for each function in the schema subscribe to an event that the remote can call and
 * listen for calls from the remote. When called execute the function and emit the results.
 *
 * @param methods an array of method ids from the local schema
 * @param _connectionID
 * @return a function to cancel all subscriptions
 */
export function registerLocalMethods(schema: ISchema = {}, methods: any[] = [], _connectionID: string): any {
  const listeners: any[] = [];
  methods.forEach((methodName) => {

    // handle a remote calling a local method
    async function handleCall(event: any) {
      const { action, callID, connectionID, callName, args } = event.data as IRPCRequestPayload;

      if (action !== actions.RPC_REQUEST) return;
      if (!isTrustedRemote(event)) return;
      if (!callID || !callName) return;
      if (callName !== methodName) return;
      if (connectionID !== _connectionID) return;

      // run function and return the results to the remote
      try {
        const result = await get(schema, methodName)(...args);
        event.source.postMessage({
          action: actions.RPC_RESOLVE,
          callID,
          callName,
          connectionID,
          result,
        }, event.origin);
      } catch (error) {
        event.source.postMessage({
          action: actions.RPC_REJECT,
          callID,
          callName,
          connectionID,
          error,
        }, event.origin);
      }
    }

    // subscribe to the call event
    window.addEventListener(events.MESSAGE, handleCall);
    listeners.push(() => window.removeEventListener(events.MESSAGE, handleCall));
  });

  return () => listeners.forEach((unregister) => unregister());
}

/**
 * create a remote object from the remote schema and methods. Functions in that object will emit an
 * event to the remote to execute an RPC.
 *
 * @param schema
 * @param _connectionID
 * @param remote
 */
export function registerRemoteMethods(schema: ISchema = {}, methods: any[] = [], _connectionID: string, event: any) {
  const remote = Object.assign({}, schema);
  const listeners: Array<() => void> = [];
  methods.forEach((methodName) => {
    const rpc = createRPC(methodName, _connectionID, event, listeners);
    set(remote, methodName, rpc);
  });
  return { remote, unregisterRemote: () => listeners.forEach((unregister) => unregister()) };
}

/**
 * create a function that will call the remote when invoked with the required arguments
 * listen to the event returned by the remote and resolve the promise
 *
 * @param _callName
 * @param _connectionID
 * @param remote
 */
export function createRPC(_callName: string, _connectionID: string, event: any, listeners: Array<() => void> = []) {
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
      listeners.push(() => window.removeEventListener(events.MESSAGE, handleResponse));
      event.source.postMessage(payload, event.origin);
    });
  };
}
