import { describe, it, expect } from "vitest";
import { EventEmitter } from "events";
import { registerRemoteMethods, registerLocalMethods } from "../src/rpc";
import { extractMethods } from "../src/helpers";

class MockPort extends EventEmitter {
  partner?: MockPort;
  postMessage(message: any) {
    setTimeout(() => {
      this.partner?.emit("message", { data: message, origin: "*" });
    }, 0);
  }
  addEventListener(event: string, handler: any) {
    this.on(event, handler);
  }
  removeEventListener(event: string, handler: any) {
    this.off(event, handler);
  }
}

function createLinkedPorts() {
  const a = new MockPort();
  const b = new MockPort();
  a.partner = b;
  b.partner = a;
  return { a, b };
}

const dummyEvent = { data: {}, origin: "*" } as any;

describe("handshake rpc", () => {
  it("calls exposed methods across the connection", async () => {
    const { a: hostPort, b: guestPort } = createLinkedPorts();
    const connectionID = "1";

    const hostSchema = { hostFn: (msg: string) => `host: ${msg}` };
    const guestSchema = {
      guestFn: async (msg: string, remote: any) => {
        const res = await remote.hostFn(msg);
        return `guest->${res}`;
      },
    };

    const hostMethods = extractMethods(hostSchema);
    const guestMethods = extractMethods(guestSchema);

    const { remote: hostRemote } = registerRemoteMethods(
      {},
      Object.keys(guestMethods),
      connectionID,
      dummyEvent,
      hostPort as any,
      guestPort as any,
    );

    const { remote: guestRemote } = registerRemoteMethods(
      {},
      Object.keys(hostMethods),
      connectionID,
      dummyEvent,
      guestPort as any,
      hostPort as any,
    );

    registerLocalMethods(hostMethods, connectionID, hostPort as any, guestPort as any, hostRemote);
    registerLocalMethods(guestMethods, connectionID, guestPort as any, hostPort as any, guestRemote);

    const simple = await guestRemote.hostFn("hi");
    expect(simple).toBe("host: hi");

    const callback = await hostRemote.guestFn("hi");
    expect(callback).toBe("guest->host: hi");
  });
});

