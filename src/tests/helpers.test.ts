import { getDeepValue, isTrustedRemote, mapDeep } from "../helpers";

describe("deepValue", () => {
  it("returns undefined for a value not found", () => {
    expect(getDeepValue({}, "foo")).toBe(undefined);
    expect(getDeepValue({ bar: { baz: "" }, faz: "" }, "foo")).toBe(undefined);
  });

  it("returns the correct value for a matching path", () => {
    const value = "test";
    expect(getDeepValue({ foo: value }, "foo")).toBe("test");
    expect(getDeepValue({ foo: { bar: { baz: value }, foo: "" } }, "foo.bar.baz")).toBe("test");
  });
});

describe("mapDeep", () => {

  it("leaves the object alone if no item is a function", () => {
    const value = { foo: { bar: { baz: "value" }, foo: "" } };
    expect(mapDeep(value)).toEqual(value);
  });

  it("correctly transforms all functions into type Function", () => {
    expect(mapDeep({ foo: () => { } })).toEqual({ "@RPC_foo": true });
  });

  it("result can be safely stringyfied and parsed back", () => {
    expect(JSON.parse(JSON.stringify(mapDeep({ foo: () => { } })))).toEqual({ "@RPC_foo": true });
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
