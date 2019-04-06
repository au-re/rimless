import { isTrustedRemote } from "../helpers";

describe("isTrustedRemote", () => {
  it("returns true if the remote is trusted", () => {
    expect(isTrustedRemote({})).toBe(true);
  });

  it("returns false if the remote is not trusted", () => {
    expect(isTrustedRemote({})).toBe(false);
  });
});
