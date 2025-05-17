import { describe, it, expect, vi, afterEach } from "vitest";

const realProcess = global.process;
const realWindow = global.window;
const realSelf = global.self;
const realWorker = global.Worker;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  global.process = realProcess as any;
  global.window = realWindow as any;
  global.self = realSelf as any;
  global.Worker = realWorker as any;
});

describe("getTargetHost", () => {
  it("returns parentPort in node worker", async () => {
    const mockPort = { postMessage: vi.fn() };
    vi.doMock("worker_threads", () => ({ parentPort: mockPort }));
    const { getTargetHost } = await import("../src/helpers");
    expect(getTargetHost()).toBe(mockPort);
  });

  it("returns self in web worker", async () => {
    global.process = undefined as any;
    global.window = undefined as any;
    global.self = { postMessage: vi.fn() } as any;
    const { getTargetHost } = await import("../src/helpers");
    expect(getTargetHost()).toBe(global.self);
  });

  it("returns window.parent in iframe", async () => {
    global.process = undefined as any;
    const parent = {};
    global.window = { parent, self: {}, top: {} } as any;
    const { getTargetHost } = await import("../src/helpers");
    expect(getTargetHost()).toBe(parent);
  });

  it("throws when no target", async () => {
    global.process = undefined as any;
    global.window = undefined as any;
    global.self = undefined as any;
    const { getTargetHost } = await import("../src/helpers");
    expect(() => getTargetHost()).toThrow();
  });
});

describe("postMessageToTarget", () => {
  it("sends message to node worker", async () => {
    const mockPort = { postMessage: vi.fn() };
    vi.doMock("worker_threads", () => ({ parentPort: mockPort }));
    const { postMessageToTarget } = await import("../src/helpers");
    postMessageToTarget(mockPort as any, { foo: "bar" });
    expect(mockPort.postMessage).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("sends message to web worker", async () => {
    global.process = undefined as any;
    global.window = undefined as any;
    const worker = { postMessage: vi.fn() };
    global.self = worker as any;
    const { postMessageToTarget } = await import("../src/helpers");
    postMessageToTarget(worker as any, { a: 1 });
    expect(worker.postMessage).toHaveBeenCalledWith({ a: 1 });
  });

  it("sends message to iframe", async () => {
    global.process = undefined as any;
    const frame = { postMessage: vi.fn() };
    global.window = { parent: frame, self: {}, top: {} } as any;
    const { postMessageToTarget } = await import("../src/helpers");
    postMessageToTarget(frame as any, { t: true }, "http://example.com");
    expect(frame.postMessage).toHaveBeenCalledWith({ t: true }, { targetOrigin: "http://example.com" });
  });

  it("throws when target is missing", async () => {
    const { postMessageToTarget } = await import("../src/helpers");
    expect(() => postMessageToTarget(null as any, {})).toThrow();
  });

  it("throws on invalid target", async () => {
    global.process = undefined as any;
    global.window = undefined as any;
    global.self = undefined as any;
    const { postMessageToTarget } = await import("../src/helpers");
    expect(() => postMessageToTarget({} as any, {})).toThrow();
  });
});

describe("environment helpers", () => {
  it("isIframe detects iframe", async () => {
    global.window = { self: {}, top: {}, parent: {} } as any;
    const { isIframe } = await import("../src/helpers");
    expect(isIframe()).toBe(true);
  });

  it("isIframe detects top window", async () => {
    const obj: any = {};
    global.window = { self: obj, top: obj } as any;
    const { isIframe } = await import("../src/helpers");
    expect(isIframe()).toBe(false);
  });

  it("isNodeWorker true when target is parentPort", async () => {
    const mockPort = { postMessage: vi.fn() };
    vi.doMock("worker_threads", () => ({ parentPort: mockPort }));
    const { isNodeWorker } = await import("../src/helpers");
    expect(isNodeWorker(mockPort as any)).toBe(true);
  });

  it("isNodeWorker false when parentPort null", async () => {
    const { isNodeWorker } = await import("../src/helpers");
    expect(isNodeWorker({} as any)).toBe(false);
  });

  it("isWorkerLike detects Worker instance", async () => {
    class MyWorker {
      postMessage() {}
    }
    global.Worker = MyWorker as any;
    const worker = new MyWorker();
    const { isWorkerLike } = await import("../src/helpers");
    expect(isWorkerLike(worker as any)).toBe(true);
  });

  it("isWorkerLike detects Node worker", async () => {
    const mockPort = { postMessage: vi.fn() };
    vi.doMock("worker_threads", () => ({ parentPort: mockPort }));
    const { isWorkerLike } = await import("../src/helpers");
    expect(isWorkerLike(mockPort as any)).toBe(true);
  });
});

describe("generateId", () => {
  it("generates strings of the specified length", async () => {
    const { generateId } = await import("../src/helpers");
    expect(generateId(5)).toHaveLength(5);
  });

  it("returns empty string for non-positive length", async () => {
    const { generateId } = await import("../src/helpers");
    expect(generateId(0)).toBe("");
    expect(generateId(-2)).toBe("");
  });
});
