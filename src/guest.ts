import { IEvent, ISchema } from "./types";

// const connection: IConnection = {};

function connect(schema: ISchema, options?: any) {
  return new Promise((resolve, reject) => {

    // subscribe RPCs from schema

    // on handshake confirmation
    function handleConfirmation(event: IEvent) {
      // register all RPCs
      // update connection object
      // resolve with connection object
    }

    // subscribe to HANDSHAKE CONFIRMATION
    // create timeout -> reject on timeout
  });
}

export default ({
  connect
});
