import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerRemoteMethods } from "../src/rpc";
import { actions, events } from "../src/types";
import * as helpers from "../src/helpers";

// Helper variables for mocks
let addEventListenerSpy: any;
let removeEventListenerSpy: any;
let postMessageSpy: any;
let generateIdSpy: any;

beforeEach(() => {
  addEventListenerSpy = vi.spyOn(helpers, "addEventListener").mockImplementation(() => {});
  removeEventListenerSpy = vi.spyOn(helpers, "removeEventListener").mockImplementation(() => {});
  postMessageSpy = vi.spyOn(helpers, "postMessageToTarget").mockImplementation(() => {});
  generateIdSpy = vi.spyOn(helpers, "generateId").mockReturnValue("id-1");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerRemoteMethods", () => {
  it("creates RPC functions on the remote object and emits messages", async () => {
    const schema = { existing: true, nested: { value: 1 } };
    const methodNames = ["foo", "nested.bar"];
    const event = { origin: "origin" } as any;
    const listenTo = {} as any;
    const sendTo = {} as any;

    const { remote } = registerRemoteMethods(schema, methodNames, "conn", event, listenTo, sendTo);

    expect(typeof (remote as any).foo).toBe("function");
    expect(typeof (remote as any).nested.bar).toBe("function");
    expect(remote.existing).toBe(true);
    expect(remote.nested.value).toBe(1);

    // Call first RPC
    const promiseFoo = (remote as any).foo("a", 1);

    expect(addEventListenerSpy).toHaveBeenCalledWith(listenTo, events.MESSAGE, expect.any(Function));
    expect(postMessageSpy).toHaveBeenCalledWith(
      sendTo,
      {
        action: actions.RPC_REQUEST,
        args: ["a", 1],
        callID: "id-1",
        callName: "foo",
        connectionID: "conn",
      },
      event.origin,
      []
    );

    // Resolve first RPC
    const handlerFoo = addEventListenerSpy.mock.calls[0][2];
    handlerFoo({
      data: {
        action: actions.RPC_RESOLVE,
        result: "resultFoo",
        callID: "id-1",
        callName: "foo",
        connectionID: "conn",
      },
    });
    await expect(promiseFoo).resolves.toBe("resultFoo");

    // Call second RPC with different id
    generateIdSpy.mockReturnValue("id-2");
    const promiseBar = (remote as any).nested.bar("b");

    expect(postMessageSpy).toHaveBeenLastCalledWith(
      sendTo,
      {
        action: actions.RPC_REQUEST,
        args: ["b"],
        callID: "id-2",
        callName: "nested.bar",
        connectionID: "conn",
      },
      event.origin,
      []
    );

    const handlerBar = addEventListenerSpy.mock.calls[1][2];
    handlerBar({
      data: {
        action: actions.RPC_RESOLVE,
        result: "resultBar",
        callID: "id-2",
        callName: "nested.bar",
        connectionID: "conn",
      },
    });
    await expect(promiseBar).resolves.toBe("resultBar");
  });
});
