import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { host, guest } from "../src/index";
import * as helpers from "../src/helpers";
import * as rpc from "../src/rpc";
import { actions, events } from "../src/types";
import { EventEmitter } from "events";

class MockPort extends EventEmitter {
  partner?: MockPort;
  postMessage(message: any) {
    this.partner?.emit("message", message);
  }
  terminate() {}
}

class MockWorker extends EventEmitter {
  postMessage = vi.fn();
  terminate = vi.fn();
}

let addEventListenerSpy: MockInstance<typeof helpers.addEventListener>;
let removeEventListenerSpy: MockInstance<typeof helpers.removeEventListener>;
let postMessageSpy: MockInstance<typeof helpers.postMessageToTarget>;
let generateIdSpy: MockInstance<typeof helpers.generateId>;
let originalSelf: any;

let serverEnvSpy: MockInstance<typeof helpers.isServerEnv>;

beforeEach(() => {
  originalSelf = global.self;
  addEventListenerSpy = vi
    .spyOn(helpers, "addEventListener")
    .mockImplementation((target: any, _event: string, handler: any) => {
      target.on("message", handler);
    });
  removeEventListenerSpy = vi
    .spyOn(helpers, "removeEventListener")
    .mockImplementation((target: any, _event: string, handler: any) => {
      target.off("message", handler);
    });
  postMessageSpy = vi.spyOn(helpers, "postMessageToTarget").mockImplementation((target: any, message: any) => {
    target.postMessage(message);
  });
  let counter = 1;
  generateIdSpy = vi.spyOn(helpers, "generateId").mockImplementation(() => `id-${counter++}`);
  serverEnvSpy = vi.spyOn(helpers, "isServerEnv").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSelf === undefined) {
    Reflect.deleteProperty(global as Record<string, unknown>, "self");
  } else {
    global.self = originalSelf;
  }
});

function setupPorts() {
  const port1 = new MockPort();
  const port2 = new MockPort();
  port1.partner = port2;
  port2.partner = port1;
  return { port1, port2 };
}

describe("handshake with rpc", () => {
  it("allows calling exposed methods after handshake", async () => {
    const { port1, port2 } = setupPorts();
    vi.spyOn(helpers, "getTargetHost").mockReturnValue(port1);
    // @ts-expect-error - mock worker self
    global.self = port1;

    const hostPromise = host.connect(port2, {
      add: (a: number, b: number) => a + b,
    });
    const guestPromise = guest.connect({});

    const guestConn = await guestPromise;
    const hostConn = await hostPromise;

    const result = await guestConn.remote.add(2, 3);
    expect(result).toBe(5);

    hostConn.close();
    guestConn.close();
  });

  it("supports using the remote parameter inside RPC handlers", async () => {
    const { port1, port2 } = setupPorts();
    vi.spyOn(helpers, "getTargetHost").mockReturnValue(port1);
    // @ts-expect-error - mock worker self
    global.self = port1;

    const hostSchema = {
      send: async (msg: string, remote: any) => {
        const res = await remote.reply(`ACK ${msg}`);
        return res;
      },
    };
    const guestSchema = {
      reply: (text: string) => `${text}!`,
    };

    const hostPromise = host.connect(port2, hostSchema);
    const guestPromise = guest.connect(guestSchema);

    const guestConn = await guestPromise;
    const hostConn = await hostPromise;

    const result = await guestConn.remote.send("ping");
    expect(result).toBe("ACK ping!");

    hostConn.close();
    guestConn.close();
  });
});

describe("handshake edge cases", () => {
  it("throws if host.connect is called without a guest", () => {
    expect(() => host.connect(undefined as any)).toThrow("a target is required");
  });

  it("throws when receiving a handshake reply for an unknown connection", () => {
    const { port2 } = setupPorts();

    const hostPromise = host.connect(port2, {});
    const connectionIdResult = generateIdSpy.mock.results[0];
    const connectionID = connectionIdResult?.value ?? "id-1";

    expect(() => {
      port2.emit("message", {
        action: actions.HANDSHAKE_REPLY,
        connectionID,
      });
    }).toThrowError("Rimless Error: No connection found for this connectionID");

    hostPromise.catch(() => {});
    port2.removeAllListeners();
  });

  it("ignores iframe handshake requests coming from an unexpected origin", () => {
    const fakeContentWindow = {
      postMessage: vi.fn(),
    } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> };

    const iframe: Partial<HTMLIFrameElement> & {
      contentWindow: Window & { postMessage: ReturnType<typeof vi.fn> };
    } = {
      src: "https://child.example.com/app",
      contentWindow: fakeContentWindow,
    };

    const windowListeners = new Map<string, Array<(event: any) => void>>();

    addEventListenerSpy.mockImplementation((target: any, event: string, handler: any) => {
      if (target === window) {
        const handlers = windowListeners.get(event) ?? [];
        handlers.push(handler);
        windowListeners.set(event, handlers);
      } else if (typeof target.on === "function") {
        target.on(event, handler);
      }
    });

    removeEventListenerSpy.mockImplementation((target: any, event: string, handler: any) => {
      if (target === window) {
        const handlers = windowListeners.get(event) ?? [];
        windowListeners.set(
          event,
          handlers.filter((cb) => cb !== handler),
        );
      } else if (typeof target.off === "function") {
        target.off(event, handler);
      }
    });

    const isWorkerLikeSpy = vi.spyOn(helpers, "isWorkerLike").mockReturnValue(false);
    const isNodeWorkerSpy = vi.spyOn(helpers, "isNodeWorker").mockReturnValue(false);

    postMessageSpy.mockClear();

    serverEnvSpy.mockReturnValue(false);
    host.connect(iframe as HTMLIFrameElement, {});

    const handlers = windowListeners.get(events.MESSAGE);
    expect(handlers).toBeDefined();

    handlers?.forEach((handler) =>
      handler({
        data: {
          action: actions.HANDSHAKE_REQUEST,
          schema: {},
          methodNames: [],
        },
        origin: "https://attacker.example.com",
        source: fakeContentWindow,
      }),
    );

    expect(postMessageSpy).not.toHaveBeenCalled();

    isWorkerLikeSpy.mockRestore();
    isNodeWorkerSpy.mockRestore();
  });

  it("terminates worker guests when the host connection closes", async () => {
    const worker = new MockWorker();
    const isWorkerLikeSpy = vi.spyOn(helpers, "isWorkerLike").mockReturnValue(true);
    serverEnvSpy.mockReturnValue(false);

    const hostPromise = host.connect(worker as unknown as Worker, {});

    worker.emit("message", {
      data: {
        action: actions.HANDSHAKE_REQUEST,
        schema: {},
        methodNames: [],
      },
      origin: "worker://example",
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      worker,
      expect.objectContaining({
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
      }),
      "worker://example",
    );

    worker.emit("message", {
      data: {
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
      },
      origin: "worker://example",
    });

    const connection = await hostPromise;
    removeEventListenerSpy.mockClear();

    connection.close();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(worker, events.MESSAGE, expect.any(Function));
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    isWorkerLikeSpy.mockRestore();
  });

  it("allows inline iframe handshakes when the source matches", async () => {
    const fakeContentWindow = {
      postMessage: vi.fn(),
    } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> };

    const iframe: Partial<HTMLIFrameElement> & {
      contentWindow: Window & { postMessage: ReturnType<typeof vi.fn> };
    } = {
      src: "about:blank",
      srcdoc: "<html></html>",
      contentWindow: fakeContentWindow,
    };

    const windowListeners = new Map<string, Array<(event: any) => void>>();

    addEventListenerSpy.mockImplementation((target: any, event: string, handler: any) => {
      if (target === window) {
        const handlers = windowListeners.get(event) ?? [];
        handlers.push(handler);
        windowListeners.set(event, handlers);
      } else if (typeof target.on === "function") {
        target.on(event, handler);
      }
    });

    removeEventListenerSpy.mockImplementation((target: any, event: string, handler: any) => {
      if (target === window) {
        const handlers = windowListeners.get(event) ?? [];
        windowListeners.set(
          event,
          handlers.filter((cb) => cb !== handler),
        );
      } else if (typeof target.off === "function") {
        target.off(event, handler);
      }
    });

    serverEnvSpy.mockReturnValue(false);

    const hostPromise = host.connect(iframe as HTMLIFrameElement, {
      greet: () => "hello",
    });

    const handlers = windowListeners.get(events.MESSAGE);
    expect(handlers).toBeDefined();

    const handshakeEvent = {
      data: {
        action: actions.HANDSHAKE_REQUEST,
        schema: { guest: { notify: vi.fn() } },
        methodNames: ["guest.notify"],
      },
      origin: "https://child.example.com",
      source: fakeContentWindow,
    };

    handlers?.forEach((handler) => handler(handshakeEvent));

    expect(postMessageSpy).toHaveBeenCalledWith(
      fakeContentWindow,
      expect.objectContaining({
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
        methodNames: ["greet"],
      }),
      handshakeEvent.origin,
    );

    const handshakeReplyEvent = {
      data: {
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
      },
      origin: handshakeEvent.origin,
      source: fakeContentWindow,
    };

    handlers?.forEach((handler) => handler(handshakeReplyEvent));
    const connection = await hostPromise;
    expect(connection.id).toBe("id-1");

    connection.close();
  });

  it("ignores duplicate handshake requests for the same connection", async () => {
    const { port2 } = setupPorts();
    const registerRemoteMethodsSpy = vi.spyOn(rpc, "registerRemoteMethods");
    const registerLocalMethodsSpy = vi.spyOn(rpc, "registerLocalMethods");

    const hostPromise = host.connect(port2, {});

    const handshakeEvent = {
      data: {
        action: actions.HANDSHAKE_REQUEST,
        schema: {},
        methodNames: [],
      },
      origin: "https://guest.example.com",
    };

    port2.emit("message", handshakeEvent);

    expect(registerRemoteMethodsSpy).toHaveBeenCalledTimes(1);
    expect(registerLocalMethodsSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);

    registerRemoteMethodsSpy.mockClear();
    registerLocalMethodsSpy.mockClear();
    postMessageSpy.mockClear();

    port2.emit("message", handshakeEvent);

    expect(registerRemoteMethodsSpy).not.toHaveBeenCalled();
    expect(registerLocalMethodsSpy).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();

    port2.emit("message", {
      data: {
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
      },
      origin: handshakeEvent.origin,
    });

    const connection = await hostPromise;
    connection.close();
  });

  it("cleans up listeners when host connection is closed", async () => {
    const { port1, port2 } = setupPorts();
    vi.spyOn(helpers, "getTargetHost").mockReturnValue(port1);
    // @ts-expect-error - mock worker self
    global.self = port1;

    const hostPromise = host.connect(port2, {
      add: (a: number, b: number) => a + b,
    });
    const guestPromise = guest.connect({});

    const guestConn = await guestPromise;
    const hostConn = await hostPromise;

    removeEventListenerSpy.mockClear();
    hostConn.close();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(port2, events.MESSAGE, expect.any(Function));
    expect(port2.listenerCount("message")).toBe(0);

    guestConn.close();
  });
});

describe("guest handshake edge cases", () => {
  it("awaits onConnectionSetup before resolving and cleans up on close", async () => {
    const listenPort = new MockPort();
    const targetPort = new MockPort();
    listenPort.partner = targetPort;
    targetPort.partner = listenPort;

    vi.spyOn(helpers, "getTargetHost").mockReturnValue(targetPort);
    // @ts-expect-error - mock worker self
    global.self = listenPort;

    const outboundMessages: any[] = [];
    postMessageSpy.mockImplementation((target: any, message: any) => {
      outboundMessages.push(message);
      if (typeof target.postMessage === "function") {
        target.postMessage(message);
      }
    });

    let resolveSetup!: () => void;
    let connectionResolved = false;
    const onConnectionSetup = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          expect(connectionResolved).toBe(false);
          resolveSetup = resolve;
        }),
    );

    const connectionPromise = guest.connect({}, { onConnectionSetup }).then((connection) => {
      connectionResolved = true;
      return connection;
    });

    const handshakeHandler = addEventListenerSpy.mock.calls[0][2] as (event: any) => void;

    handshakeHandler({
      data: {
        action: actions.HANDSHAKE_REPLY,
        connectionID: "guest-connection",
        schema: {},
        methodNames: [],
      },
      origin: "https://host.example",
      source: targetPort,
    });

    expect(onConnectionSetup).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(connectionResolved).toBe(false);
    expect(outboundMessages).toHaveLength(1);
    expect(outboundMessages[0]).toMatchObject({ action: actions.HANDSHAKE_REQUEST });

    resolveSetup();
    await Promise.resolve();

    const connection = await connectionPromise;
    expect(connectionResolved).toBe(true);
    expect(outboundMessages).toHaveLength(2);
    expect(outboundMessages[1]).toMatchObject({ action: actions.HANDSHAKE_REPLY, connectionID: "guest-connection" });

    removeEventListenerSpy.mockClear();
    connection.close();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(listenPort, events.MESSAGE, expect.any(Function));
  });
});
