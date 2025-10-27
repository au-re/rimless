import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { host, guest } from "../src/index";
import * as helpers from "../src/helpers";
import { actions, events } from "../src/types";
import { EventEmitter } from "events";

class MockPort extends EventEmitter {
  partner?: MockPort;
  postMessage(message: any) {
    this.partner?.emit("message", message);
  }
  terminate() {}
}

let addEventListenerSpy: any;
let removeEventListenerSpy: any;
let postMessageSpy: any;
let generateIdSpy: any;
let originalSelf: any;

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
  postMessageSpy = vi
    .spyOn(helpers, "postMessageToTarget")
    .mockImplementation((target: any, message: any) => {
      target.postMessage(message);
    });
  let counter = 1;
  generateIdSpy = vi
    .spyOn(helpers, "generateId")
    .mockImplementation(() => `id-${counter++}`);
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

    const isNodeEnvSpy = vi.spyOn(helpers, "isNodeEnv").mockReturnValue(false);
    const isWorkerLikeSpy = vi.spyOn(helpers, "isWorkerLike").mockReturnValue(false);
    const isNodeWorkerSpy = vi.spyOn(helpers, "isNodeWorker").mockReturnValue(false);

    postMessageSpy.mockClear();

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

    isNodeEnvSpy.mockRestore();
    isWorkerLikeSpy.mockRestore();
    isNodeWorkerSpy.mockRestore();
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

    const connectionPromise = guest
      .connect({}, { onConnectionSetup })
      .then((connection) => {
        connectionResolved = true;
        return connection;
      });

    const handshakeHandler = addEventListenerSpy.mock.calls[0][2];

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
