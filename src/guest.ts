import { registerLocalAPI, registerRemoteAPI } from "./rpc";
import { actions, events, ISchema } from "./types";

function connect(schema: ISchema, options?: any) {
  return new Promise((resolve, reject) => {

    // on handshake response
    function handleHandshakeResponse(event: any) {
      if (event.data.action !== actions.HANDSHAKE_REPLY) return;

      // register local and remote APIs
      registerLocalAPI(schema, event.data.connectionID);
      const connection = registerRemoteAPI(event.data.schema, event.data.connectionID, event.source);

      // resolve the parent connection object
      return resolve(connection);
    }

    // subscribe to HANDSHAKE REPLY MESSAGES
    window.addEventListener(events.MESSAGE, handleHandshakeResponse);

    // TODO: check if connection ID should be stored globaly
    window.parent.postMessage({ schema }, "*");
  });
}

export default ({
  connect,
});
