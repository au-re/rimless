import get from "lodash.get";
import set from "lodash.set";
import short from "short-uuid";

import { isTrustedRemote, isWorker } from "./helpers";
import { actions, events, IRPCRequestPayload, IRPCResolvePayload, ISchema } from "./types";

/**
 * for each function in the schema
 * 1. subscribe to an event that the remote can call
 * 2. listen for calls from the remote. When called execute the function and emit the results.
 *
 * @param methods an array of method ids from the local schema
 * @param _connectionID
 * @return a function to cancel all subscriptions
 */
export function registerLocalMethods(
  schema: ISchema = {},
  methods: any[] = [],
  _connectionID: string,
  guest?: Worker): any {

  const listeners: any[] = [];
  methods.forEach((methodName) => {

    // handle a remote calling a local method
    async function handleCall(event: any) {
      const { action, callID, connectionID, callName, args = [] } = event.data as IRPCRequestPayload;

      if (action !== actions.RPC_REQUEST) return;
      if (!isTrustedRemote(event)) return;
      if (!callID || !callName) return;
      if (callName !== methodName) return;
      if (connectionID !== _connectionID) return;

      const payload: IRPCResolvePayload = {
        action: actions.RPC_RESOLVE,
        callID,
        callName,
        connectionID,
        error: null,
        result: null,
      };

      // run function and return the results to the remote
      try {
        const result = await get(schema, methodName)(...args);
        payload.result = JSON.parse(JSON.stringify(result));
      } catch (error) {
        payload.error = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }

      if (guest) guest.postMessage(payload);
      else if (isWorker()) (self as any).postMessage(payload);
      else event.source.postMessage(payload, event.origin);
    }

    // subscribe to the call event
    if (guest) guest.addEventListener(events.MESSAGE, handleCall);
    else self.addEventListener(events.MESSAGE, handleCall);

    listeners.push(() => self.removeEventListener(events.MESSAGE, handleCall));
  });

  return () => listeners.forEach((unregister) => unregister());
}

/**
 * create a remote object based on the remote schema and methods. Functions in that object will
 * emit an event to the remote to execute an RPC.
 *
 * @param schema
 * @param _connectionID
 * @param remote
 */
export function registerRemoteMethods(
  schema: ISchema = {},
  methods: any[] = [],
  _connectionID: string,
  event: any, guest?: Worker) {

  const remote = Object.assign({}, schema);
  const listeners: Array<() => void> = [];

  methods.forEach((methodName) => {
    const rpc = createRPC(methodName, _connectionID, event, listeners, guest);
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
export function createRPC(
  _callName: string,
  _connectionID: string,
  event: any,
  listeners: Array<() => void> = [],
  guest?: Worker) {

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
        args: JSON.parse(JSON.stringify(args)),
        callID,
        callName: _callName,
        connectionID: _connectionID,
      };

      if (guest) guest.addEventListener(events.MESSAGE, handleResponse);
      else self.addEventListener(events.MESSAGE, handleResponse);
      listeners.push(() => self.removeEventListener(events.MESSAGE, handleResponse));

      if (guest) guest.postMessage(payload);
      else if (isWorker()) (self as any).postMessage(payload);
      else (event.source || event.target).postMessage(payload, event.origin);
    });
  };
}
