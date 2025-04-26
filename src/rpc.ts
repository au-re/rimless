import {
  addEventListener,
  generateId,
  get,
  getEventData,
  postMessageToTarget,
  removeEventListener,
  set,
} from "./helpers";
import { actions, events, IRPCRequestPayload, IRPCResolvePayload, ISchema, Target } from "./types";

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
  listenTo: Worker | Window,
  target: Target,
) {
  const listeners: any[] = [];

  methods.forEach((methodName) => {
    // handle a remote calling a local method
    async function handleCall(event: any) {
      const eventData = getEventData(event);
      const { action, callID, connectionID, callName, args = [] } = eventData as IRPCRequestPayload;

      if (action !== actions.RPC_REQUEST) return;
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

        if (!result) {
          // if the result is falsy (null, undefined, "", etc), set it directly
          payload.result = result;
        } else {
          // otherwise parse a stringified version of it
          payload.result = JSON.parse(JSON.stringify(result));
        }
      } catch (error) {
        payload.action = actions.RPC_REJECT;
        payload.error = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }

      postMessageToTarget(target, payload, event?.origin);
    }

    // subscribe to the call event
    addEventListener(listenTo, events.MESSAGE, handleCall);
    listeners.push(() => removeEventListener(listenTo, events.MESSAGE, handleCall));
  });

  return () => listeners.forEach((unregister) => unregister());
}

/**
 * Create a function that will make an RPC request to the remote with some arguments.
 * Listen to an event that returns the results from the remote.
 *
 * @param _callName
 * @param _connectionID
 * @param event
 * @param listeners
 * @param guest
 *
 * @returns a promise with the result of the RPC
 */
export function createRPC(
  _callName: string,
  _connectionID: string,
  event: any,
  listeners: Array<() => void> = [],
  listenTo: Worker | Window,
  target: Target,
) {
  return (...args: any) => {
    return new Promise((resolve, reject) => {
      const _callID = generateId();

      // on RPC response
      function handleResponse(event: any) {
        const eventData = getEventData(event);
        const { callID, connectionID, callName, result, error, action } = eventData as IRPCResolvePayload;

        if (!callID || !callName) return;
        if (callName !== _callName) return;
        if (_callID !== callID) return;
        if (connectionID !== _connectionID) return;

        // resolve the response
        if (action === actions.RPC_RESOLVE) return resolve(result);
        if (action === actions.RPC_REJECT) return reject(error);
      }

      // send the RPC request with arguments
      const payload = {
        action: actions.RPC_REQUEST,
        args: JSON.parse(JSON.stringify(args)),
        callID: _callID,
        callName: _callName,
        connectionID: _connectionID,
      };

      addEventListener(listenTo, events.MESSAGE, handleResponse);
      listeners.push(() => removeEventListener(listenTo, events.MESSAGE, handleResponse));

      postMessageToTarget(target, payload, event?.origin);
    });
  };
}

/**
 * create an object based on the remote schema and methods. Functions in that object will
 * emit an event that will trigger the RPC on the remote.
 *
 * @param schema
 * @param methods
 * @param connectionID
 * @param event
 * @param guest
 */
export function registerRemoteMethods(
  schema: ISchema = {},
  methods: any[] = [],
  connectionID: string,
  event: any,
  listenTo: Worker | Window,
  target: Target,
) {
  const remote = { ...schema };
  const listeners: Array<() => void> = [];

  methods.forEach((methodName) => {
    const rpc = createRPC(methodName, connectionID, event, listeners, listenTo, target);
    set(remote, methodName, rpc);
  });

  return {
    remote,
    unregisterRemote: () => listeners.forEach((unregister) => unregister()),
  };
}
