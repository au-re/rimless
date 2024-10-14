import { describe, it, expect } from "vitest";
import { extractMethods, isTrustedRemote } from "../src/helpers";

describe("extract functions", () => {
  const noFunctions = {
    foo: {
      bar: {
        baz: "value",
      },
      foo: "",
    },
  };

  const shallowFunctions = {
    bar: { baz: "value" },
    baz: () => {},
    foo: () => {},
  };

  const nestedFunctions = {
    foo: {
      bar: {
        baz: () => {},
      },
      foo: () => {},
    },
  };

  it("returns an empty array if no function is present", () => {
    expect(extractMethods(noFunctions)).toEqual([]);
  });

  it("correctly returns the path for shallow functions", () => {
    expect(extractMethods(shallowFunctions).sort()).toEqual(
      ["foo", "baz"].sort()
    );
  });

  it("correctly returns the path for nested functions", () => {
    expect(extractMethods(nestedFunctions).sort()).toEqual(
      ["foo.bar.baz", "foo.foo"].sort()
    );
  });
});

describe("isTrustedRemote", () => {
  it.skip("returns true if the remote is trusted", () => {
    expect(isTrustedRemote({})).toBe(true);
  });

  it.skip("returns false if the remote is not trusted", () => {
    expect(isTrustedRemote({})).toBe(false);
  });
});
