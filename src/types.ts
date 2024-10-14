export enum events {
  MESSAGE = "message",
}

export enum actions {
  HANDSHAKE_REQUEST = "RIMLESS/HANDSHAKE_REQUEST",
  HANDSHAKE_REPLY = "RIMLESS/HANDSHAKE_REPLY",
  RPC_REQUEST = "RIMLESS/RPC_REQUEST",
  RPC_RESOLVE = "RIMLESS/RPC_RESOLVE",
  RPC_REJECT = "RIMLESS/RPC_REJECT",
}

export interface ISchema {
  [prop: string]: any;
}

export interface IConnection {
  remote: ISchema;
  close: () => void;
}

export interface IConnections {
  [connectionID: string]: ISchema;
}

export interface IEvent extends EventListener {
  source?: Window;
  origin?: string;
  data?: IHandshakeRequestPayload | IHandshakeConfirmationPayload | IRPCRequestPayload | IRPCResolvePayload;
}

export interface IHandshakeRequestPayload {
  action: actions.HANDSHAKE_REQUEST;
  connectionID?: string;
  methods: any[];
  schema: ISchema;
}

export interface IHandshakeConfirmationPayload {
  action: actions.HANDSHAKE_REPLY;
  connectionID: string;
  methods: any[];
  schema: ISchema;
}

export interface IRPCRequestPayload {
  action: actions.RPC_REQUEST;
  args: any[];
  callID: string;
  callName: string;
  connectionID?: string;
}

export interface IRPCResolvePayload {
  action: actions.RPC_RESOLVE | actions.RPC_REJECT;
  result?: any | null;
  error?: Error | null;
  callID: string;
  callName: string;
  connectionID: string;
}
