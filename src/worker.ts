import { extractMethods } from "./helpers";
import { registerLocalMethods, registerRemoteMethods } from "./rpc";
import { actions, events, ISchema } from "./types";

if (!onmessage || !postMessage) throw new Error("must be run within a webworker");

function connect(schema: ISchema = {}, options: any = {}): Promise<any> {

  return new Promise((resolve, reject) => {

    const localMethods = extractMethods(schema);

    // on handshake response
    function handleHandshakeResponse(event: any) {
      if (event.data.action !== actions.HANDSHAKE_REPLY) return;

      // register local methods
      const unregisterLocal = registerLocalMethods(schema, localMethods, event.data.connectionID);

      // register remote methods
      const { remote, unregisterRemote } =
        registerRemoteMethods(event.data.schema, event.data.methods, event.data.connectionID, event);

      // close the connection and all listeners when called
      const close = () => {
        unregisterRemote();
        unregisterLocal();
      };

      // resolve connection object
      const connection = { remote, close };
      return resolve(connection);
    }

    // subscribe to HANDSHAKE REPLY MESSAGES
    (onmessage as any)(handleHandshakeResponse);

    (postMessage as any)({
      action: actions.HANDSHAKE_REQUEST,
      methods: localMethods,
      schema: JSON.parse(JSON.stringify(schema)),
    });
  });
}

export default ({
  connect,
});
