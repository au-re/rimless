import { addEventListener, generateId, getEventData, postMessageToTarget, removeEventListener, set } from "./helpers";
import {
  actions,
  Environment,
  events,
  RimlessEvent,
  RPCRequestPayload,
  RPCResolvePayload,
  Schema,
  Target,
} from "./types";

/** Private symbol to which we will assign transferable objects */
const SYM_TRANSFERABLES = Symbol();

/**
 * for each function in methods
 * 1. subscribe to an event that the remote can call
 * 2. listen for calls from the remote. When called execute the function and emit the results.
 *
 * @param methods an object of method ids : methods from the local schema
 * @param rpcConnectionID
 * @return a function to cancel all subscriptions
 */
export function registerLocalMethods(
  methods: Record<string, (...args: any[]) => any> = {},
  rpcConnectionID: string,
  listenTo: Environment,
  sendTo: Target
) {
  const listeners: any[] = [];
  for (const [methodName, method] of Object.entries(methods)) {
    // handle a remote calling a local method
    async function handleCall(event: any) {
      const eventData = getEventData(event);
      const { action, callID, connectionID, callName, args = [] } = eventData as RPCRequestPayload;

      if (action !== actions.RPC_REQUEST) return;
      if (!callID || !callName) return;
      if (callName !== methodName) return;
      if (connectionID !== rpcConnectionID) return;

      const payload: RPCResolvePayload = {
        action: actions.RPC_RESOLVE,
        callID,
        callName,
        connectionID,
        error: null,
        result: null,
      };

      // when a host function returns transferable results to the remote, the
      // transferables are assigned to a special symbol on each function's result
      let transferables: Transferable[] | undefined = undefined;

      // run function and return the results to the remote
      try {
        payload.result = await method(...args);

        if (payload.result && payload.result[SYM_TRANSFERABLES]) {
          transferables = payload.result[SYM_TRANSFERABLES] ?? [];
          delete payload.result[SYM_TRANSFERABLES];
        }
      } catch (error) {
        payload.action = actions.RPC_REJECT;
        payload.error = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }

      postMessageToTarget(sendTo, payload, event?.origin, transferables);
    }

    // subscribe to the call event
    addEventListener(listenTo, events.MESSAGE, handleCall);
    listeners.push(() => removeEventListener(listenTo, events.MESSAGE, handleCall));
  }

  return () => listeners.forEach((unregister) => unregister());
}

/**
 * Create a function that will make an RPC request to the remote with some arguments.
 * Listen to an event that returns the results from the remote.
 *
 * @param rpcCallName
 * @param rpcConnectionID
 * @param event
 * @param listeners
 * @param guest
 *
 * @returns a promise with the result of the RPC
 */
export function createRPC(
  rpcCallName: string,
  rpcConnectionID: string,
  event: RimlessEvent,
  listeners: Array<() => void> = [],
  listenTo: Environment,
  sendTo: Target
) {
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      const requestID = generateId();

      // on RPC response
      function handleResponse(event: any) {
        const eventData = getEventData(event);
        const { callID, connectionID, callName, result, error, action } = eventData as RPCResolvePayload;

        if (!callID || !callName) return;
        if (callName !== rpcCallName) return;
        if (callID !== requestID) return;
        if (connectionID !== rpcConnectionID) return;

        // resolve the response
        if (action === actions.RPC_RESOLVE) return resolve(result);
        if (action === actions.RPC_REJECT) return reject(error);
      }

      // send the RPC request with arguments
      const payload = {
        action: actions.RPC_REQUEST,
        args,
        callID: requestID,
        callName: rpcCallName,
        connectionID: rpcConnectionID,
      };

      // if the arguments have transferables, post them as well
      const transferables = args.reduce(
        (transferables, arg) =>
          arg[SYM_TRANSFERABLES]?.length ? transferables.concat(arg[SYM_TRANSFERABLES]) : transferables,
        // @ts-expect-error: we know this is an array of transferables (if it exists)
        args[SYM_TRANSFERABLES] ?? []
      );

      addEventListener(listenTo, events.MESSAGE, handleResponse);
      listeners.push(() => removeEventListener(listenTo, events.MESSAGE, handleResponse));

      postMessageToTarget(sendTo, payload, event?.origin, transferables);
    });
  };
}

/**
 * create an object based on the remote schema's methods. Functions in that object will
 * emit an event that will trigger the RPC on the remote.
 *
 * @param schema
 * @param methods
 * @param connectionID
 * @param event
 * @param guest
 */
export function registerRemoteMethods(
  schema: Schema = {},
  methodNames: Iterable<string> = [],
  connectionID: string,
  event: RimlessEvent,
  listenTo: Environment,
  sendTo: Target
) {
  const remote = { ...schema };
  const listeners: Array<() => void> = [];

  for (const methodName of methodNames) {
    const rpc = createRPC(methodName, connectionID, event, listeners, listenTo, sendTo);
    set(remote, methodName, rpc);
  }

  return {
    remote,
    unregisterRemote: () => listeners.forEach((unregister) => unregister()),
  };
}

/**
 * This function is used by API schema declarations and remote function calls alike to
 * indicate which variables should be declared as transferable over `postMessage` calls.
 *
 * @param cb a function that takes a transfer function as an argument and returns an object
 *           (in the loose, `typeof foo === "object"` sense)
 * @return result the callback's return value, with an extra array of transferable objects
 *                assigned to rimless' private symbol `SYM_TRANSFERABLES`
 *
 * The `transfer(...)` function can be called with one or more objects to transfer. When
 * called with one object, it returns that object. When called with zero or multiple objects,
 * it returns an array of the objects. Calling `transfer` will only modify the callback result,
 * not the original object itself (or objects themselves).
 *
 * @example
 * host.connect({
 *   foo: (...args) => {
 *     const foo = new ArrayBuffer(8);
 *     const bar = new ArrayBuffer(8);
 *
 *     return withTransferable((transfer) => transfer(foo, bar));
 *   }),                                  // equal to [transfer(foo), transfer(bar)]
 * });
 *
 * @example
 * host.remote.foo(withTransferable((transfer) => ({
 *   stream: transfer(new ReadableStream()),
 * })));
 */
export const withTransferable = <T, V extends object>(cb: (transfer: (transferable: T) => void) => V) => {
  const transferables: T[] = [];
  const transfer = (...toTransfer: [T, ...T[]]) => {
    transferables.push(...toTransfer);
    return toTransfer.length === 1 ? toTransfer[0] : toTransfer;
  };

  const result = cb(transfer);

  return Object.assign(result, { [SYM_TRANSFERABLES]: transferables });
};
