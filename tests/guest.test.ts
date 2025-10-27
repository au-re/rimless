import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { guest } from "../src/index";
import * as helpers from "../src/helpers";
import * as rpc from "../src/rpc";
import { actions, events } from "../src/types";

describe("guest.connect", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;
  let getTargetHostSpy: ReturnType<typeof vi.spyOn>;
  let getEventDataSpy: ReturnType<typeof vi.spyOn>;
  let registerRemoteMethodsSpy: ReturnType<typeof vi.spyOn>;
  let registerLocalMethodsSpy: ReturnType<typeof vi.spyOn>;

  let unregisterRemoteMock: ReturnType<typeof vi.fn>;
  let unregisterLocalMock: ReturnType<typeof vi.fn>;
  let remoteAPI: Record<string, any>;
  let mockTarget: Record<string, unknown>;
  let messageHandler: ((event: any) => Promise<void> | void) | undefined;
  let originalSelf: typeof globalThis.self | undefined;

  beforeEach(() => {
    originalSelf = globalThis.self;
    mockTarget = { id: "target-host" };
    remoteAPI = { notify: vi.fn() };
    unregisterRemoteMock = vi.fn();
    unregisterLocalMock = vi.fn();

    addEventListenerSpy = vi
      .spyOn(helpers, "addEventListener")
      .mockImplementation((_target, _eventName, handler) => {
        messageHandler = handler;
      });

    removeEventListenerSpy = vi.spyOn(helpers, "removeEventListener").mockImplementation(() => {});
    postMessageSpy = vi.spyOn(helpers, "postMessageToTarget").mockImplementation(() => {});
    getTargetHostSpy = vi.spyOn(helpers, "getTargetHost").mockReturnValue(mockTarget);
    getEventDataSpy = vi.spyOn(helpers, "getEventData");

    registerRemoteMethodsSpy = vi.spyOn(rpc, "registerRemoteMethods").mockImplementation(
      () =>
        ({
          remote: remoteAPI,
          unregisterRemote: unregisterRemoteMock,
        }) as ReturnType<typeof rpc.registerRemoteMethods>,
    );

    registerLocalMethodsSpy = vi.spyOn(rpc, "registerLocalMethods").mockReturnValue(unregisterLocalMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSelf === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as typeof globalThis & { self?: typeof globalThis.self }).self;
    } else {
      globalThis.self = originalSelf;
    }
  });

  it("sends a handshake request and wires RPC bindings on handshake reply", async () => {
    const schema = {
      value: 42,
      ping: () => "pong",
      math: {
        multiply: (a: number, b: number) => a * b,
      },
    };

    const connectionPromise = guest.connect(schema);

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    const [listenTarget, listenEvent, listenHandler] = addEventListenerSpy.mock.calls[0];
    expect(listenEvent).toBe(events.MESSAGE);
    expect(listenHandler).toBe(messageHandler);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);

    const [requestTarget, requestPayload] = postMessageSpy.mock.calls[0];
    expect(requestTarget).toBe(mockTarget);
    expect(requestPayload.action).toBe(actions.HANDSHAKE_REQUEST);
    expect(requestPayload.methodNames).toEqual(expect.arrayContaining(["ping", "math.multiply"]));
    expect(requestPayload.methodNames).toHaveLength(2);
    expect(requestPayload.schema).toBe(schema);
    expect(schema).toEqual({ value: 42, math: {} });

    const handshakeData = {
      action: actions.HANDSHAKE_REPLY,
      connectionID: "guest-connection",
      methodNames: ["host.alert"],
      schema: { alert: vi.fn() },
    };
    const handshakeEvent = { origin: "https://host.example", source: {} };

    getEventDataSpy.mockReturnValue(handshakeData);
    await messageHandler?.(handshakeEvent);
    const connection = await connectionPromise;

    expect(registerRemoteMethodsSpy).toHaveBeenCalledWith(
      handshakeData.schema,
      handshakeData.methodNames,
      handshakeData.connectionID,
      handshakeEvent,
      listenTarget,
      mockTarget,
    );

    expect(registerLocalMethodsSpy).toHaveBeenCalledTimes(1);
    const [localMethods, connectionID, localListenTarget, sendTarget, remoteArg] = registerLocalMethodsSpy.mock.calls[0];
    expect(Object.keys(localMethods).sort()).toEqual(["math.multiply", "ping"]);
    expect(connectionID).toBe(handshakeData.connectionID);
    expect(localListenTarget).toBe(listenTarget);
    expect(sendTarget).toBe(mockTarget);
    expect(remoteArg).toBe(remoteAPI);

    expect(postMessageSpy).toHaveBeenCalledTimes(2);
    const [, replyPayload, replyOrigin] = postMessageSpy.mock.calls[1];
    expect(replyPayload).toEqual({
      action: actions.HANDSHAKE_REPLY,
      connectionID: handshakeData.connectionID,
    });
    expect(replyOrigin).toBe(handshakeEvent.origin);

    expect(connection.id).toBe(handshakeData.connectionID);
    expect(connection.remote).toBe(remoteAPI);
    expect(typeof connection.close).toBe("function");

    connection.close();
  });

  it("cleans up listeners and RPC registrations when closed", async () => {
    const schema = {
      pong: () => "pong",
    };

    const connectionPromise = guest.connect(schema);
    const handshakeData = {
      action: actions.HANDSHAKE_REPLY,
      connectionID: "cleanup-id",
      methodNames: [],
      schema: {},
    };

    getEventDataSpy.mockReturnValue(handshakeData);
    const handshakeEvent = { origin: "https://example.test", source: {} };
    await messageHandler?.(handshakeEvent);
    const connection = await connectionPromise;

    removeEventListenerSpy.mockClear();
    unregisterRemoteMock.mockClear();
    unregisterLocalMock.mockClear();

    connection.close();

    const [listenTarget] = addEventListenerSpy.mock.calls[0];
    expect(removeEventListenerSpy).toHaveBeenCalledWith(listenTarget, events.MESSAGE, messageHandler);
    expect(unregisterRemoteMock).toHaveBeenCalledTimes(1);
    expect(unregisterLocalMock).toHaveBeenCalledTimes(1);
  });
});
