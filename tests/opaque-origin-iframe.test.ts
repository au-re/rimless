import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as helpers from "../src/helpers";
import { host } from "../src/index";
import { actions, events } from "../src/types";

let removeEventListenerSpy: MockInstance<typeof helpers.removeEventListener>;
let postMessageSpy: MockInstance<typeof helpers.postMessageToTarget>;
let windowListeners: Map<string, Array<(event: any) => void>>;

beforeEach(() => {
  windowListeners = new Map();

  vi.spyOn(helpers, "addEventListener").mockImplementation((target, event, handler) => {
    if (target !== window || typeof handler !== "function") return;

    const handlers = windowListeners.get(event) ?? [];
    handlers.push(handler as (event: any) => void);
    windowListeners.set(event, handlers);
  });

  removeEventListenerSpy = vi.spyOn(helpers, "removeEventListener").mockImplementation((target, event, handler) => {
    if (target !== window) return;

    const handlers = windowListeners.get(event) ?? [];
    windowListeners.set(
      event,
      handlers.filter((cb) => cb !== handler),
    );
  });

  postMessageSpy = vi.spyOn(helpers, "postMessageToTarget").mockImplementation(() => {});
  vi.spyOn(helpers, "generateId").mockReturnValue("id-1");
  vi.spyOn(helpers, "isServerEnv").mockReturnValue(false);
  vi.spyOn(helpers, "isWorkerLike").mockReturnValue(false);
  vi.spyOn(helpers, "isNodeWorker").mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createMockIframe({ sandbox, src = "https://child.example.com/app" }: { sandbox?: string; src?: string } = {}) {
  const sandboxTokens = new Set(sandbox?.split(/\s+/).filter(Boolean) ?? []);
  const contentWindow = { postMessage: vi.fn() };

  return {
    contentWindow,
    src,
    srcdoc: "",
    hasAttribute: (name: string) => name === "sandbox" && sandbox !== undefined,
    sandbox: {
      contains: (token: string) => sandboxTokens.has(token),
    },
  } as unknown as HTMLIFrameElement & {
    contentWindow: Window & { postMessage: ReturnType<typeof vi.fn> };
  };
}

function dispatchMessage(event: any) {
  windowListeners.get(events.MESSAGE)?.forEach((handler) => handler(event));
}

function createHandshakeRequest(origin: string, source: Window) {
  return {
    data: {
      action: actions.HANDSHAKE_REQUEST,
      methodNames: [],
      schema: {},
    },
    origin,
    source,
  };
}

function createHandshakeReply(origin: string, source: Window) {
  return {
    data: {
      action: actions.HANDSHAKE_REPLY,
      connectionID: "id-1",
    },
    origin,
    source,
  };
}

describe("opaque-origin iframe handshakes", () => {
  it("accepts sandboxed opaque iframe messages when the source matches", async () => {
    const iframe = createMockIframe({ sandbox: "allow-scripts" });
    const connectionPromise = host.connect(iframe, {});

    dispatchMessage(createHandshakeRequest("null", iframe.contentWindow));

    expect(postMessageSpy).toHaveBeenCalledWith(
      iframe.contentWindow,
      expect.objectContaining({
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
      }),
      "null",
    );

    dispatchMessage(createHandshakeReply("null", iframe.contentWindow));

    const connection = await connectionPromise;
    connection.close();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(window, events.MESSAGE, expect.any(Function));
  });

  it("rejects sandboxed opaque iframe messages when the source does not match", () => {
    const iframe = createMockIframe({ sandbox: "allow-scripts" });
    const attackerWindow = { postMessage: vi.fn() } as unknown as Window;

    host.connect(iframe, {});

    dispatchMessage(createHandshakeRequest("null", attackerWindow));

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("keeps normal iframe validation strict by requiring matching origin and source", async () => {
    const iframe = createMockIframe();
    const attackerWindow = { postMessage: vi.fn() } as unknown as Window;
    const connectionPromise = host.connect(iframe, {});

    dispatchMessage(createHandshakeRequest("https://child.example.com", attackerWindow));
    dispatchMessage(createHandshakeRequest("https://attacker.example.com", iframe.contentWindow));

    expect(postMessageSpy).not.toHaveBeenCalled();

    dispatchMessage(createHandshakeRequest("https://child.example.com", iframe.contentWindow));

    expect(postMessageSpy).toHaveBeenCalledWith(
      iframe.contentWindow,
      expect.objectContaining({
        action: actions.HANDSHAKE_REPLY,
        connectionID: "id-1",
      }),
      "https://child.example.com",
    );

    dispatchMessage(createHandshakeReply("https://child.example.com", iframe.contentWindow));

    const connection = await connectionPromise;
    connection.close();
  });
});
