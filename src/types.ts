export interface NodeWorker {
  on(event: string, handler: any): void;
  off(event: string, handler: any): void;
  postMessage(message: any): void;
  terminate(): void;
}

export type WorkerLike = Worker | NodeWorker;

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

export type Schema = Record<string, any>;

export interface Connection {
  id: string;
  remote: Schema;
  close: () => void;
}

export type Connections = Record<string, Connection>;

export interface RimlessEvent extends EventListener {
  source?: Window;
  origin?: string;
  data: HandshakeRequestPayload | HandshakeConfirmationPayload | RPCRequestPayload | RPCResolvePayload;
}

export interface HandshakeRequestPayload {
  action: actions.HANDSHAKE_REQUEST;
  connectionID: string;
  methodNames: string[];
  schema: Schema;
}

export interface HandshakeConfirmationPayload {
  action: actions.HANDSHAKE_REPLY;
  connectionID: string;
  methodNames: string[];
  schema: Schema;
}

export interface RPCRequestPayload {
  action: actions.RPC_REQUEST;
  args: any[];
  callID: string;
  callName: string;
  connectionID: string;
}

export interface RPCResolvePayload {
  action: actions.RPC_RESOLVE | actions.RPC_REJECT;
  result?: any | null;
  error?: Error | null;
  callID: string;
  callName: string;
  connectionID: string;
}

export interface EventHandlers {
  onConnectionSetup: (remote: Schema) => Promise<void>;
}

export type Guest = WorkerLike | HTMLIFrameElement;
export type Target = Window | WorkerLike;
export type Environment = Window | WorkerLike;
