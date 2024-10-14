import { describe, expect, it } from "vitest";
import { guest, host } from "../src/index";

describe("guest", () => {
  it("returns a promise when trying to connect", () => {
    expect(guest.connect()).toBeInstanceOf(Promise);
  });
});

describe("host", () => {
  it("returns a promise when trying to connect", () => {
    const iframe = document.createElement("iframe");
    expect(host.connect(iframe)).toBeInstanceOf(Promise);
  });
});
