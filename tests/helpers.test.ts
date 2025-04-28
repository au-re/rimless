import { describe, it, expect, afterEach } from "vitest";
import { extractMethods, isWorker, isNodeEnv, getOriginFromURL } from "../src/helpers";

describe("extract functions", () => {
  const noFunctions = {
    foo: "bar",
    baz: 123,
  };

  const singleFunction = {
    foo: () => {},
  };

  const multipleFunctions = {
    foo: () => {},
    bar: () => {},
  };

  const nestedFunctions = {
    foo: {
      foo: () => {},
      bar: {
        baz: () => {},
      },
    },
  };

  it("extracts and returns empty object when no functions", () => {
    expect(extractMethods(noFunctions)).toEqual({});
  });

  it("extracts and returns a single function path : fn pair", () => {
    const { foo } = singleFunction;

    expect(extractMethods(singleFunction)).toEqual({ foo });

    // deletes the function from the original object
    expect(singleFunction).toEqual({ foo: undefined });
  });

  it("extracts and returns multiple function path : fn pairs", () => {
    const { foo, bar } = multipleFunctions;

    expect(extractMethods(multipleFunctions)).toEqual({ foo, bar });

    // deletes the functions from the original object
    expect(multipleFunctions).toEqual({ foo: undefined, bar: undefined });
  });

  it("extracts and returns a flat object with nested function path : fn pairs", () => {
    const {
      foo: {
        foo,
        bar: { baz },
      },
    } = nestedFunctions;

    expect(extractMethods(nestedFunctions)).toEqual({
      "foo.bar.baz": baz,
      "foo.foo": foo,
    });

    // deletes the functions from the original object
    expect(nestedFunctions).toEqual({
      foo: { bar: { baz: undefined }, foo: undefined },
    });
  });

  it("handles null and undefined values", () => {
    const withNulls = {
      foo: null,
      bar: undefined,
      baz: () => {},
    };
    const { baz } = withNulls;

    expect(extractMethods(withNulls)).toEqual({ baz });

    // deletes the function from the original object
    expect(withNulls).toEqual({ foo: null, bar: undefined, baz: undefined });
  });

  it("handles arrays of functions", () => {
    const withArrays = {
      foo: [() => {}, () => {}],
      bar: () => {},
    };
    const {
      foo: [foo0, foo1],
      bar,
    } = withArrays;

    expect(extractMethods(withArrays)).toEqual({
      "foo.0": foo0,
      "foo.1": foo1,
      bar: bar,
    });
  });
});

describe("environment detection", () => {
  describe("isWorker", () => {
    const originalWindow = global.window;
    const originalSelf = global.self;

    afterEach(() => {
      global.window = originalWindow;
      global.self = originalSelf;
    });

    it("returns true in worker environment", () => {
      // @ts-expect-error - mocking worker env
      global.window = undefined;
      // @ts-expect-error - mocking worker env
      global.self = {};
      expect(isWorker()).toBe(true);
    });

    it("returns false in browser environment", () => {
      // @ts-expect-error - mocking browser env
      global.window = {};
      // @ts-expect-error - mocking browser env
      global.self = {};
      expect(isWorker()).toBe(false);
    });

    it("returns false when self is undefined", () => {
      // @ts-expect-error - mocking node env
      global.window = undefined;
      // @ts-expect-error - mocking node env
      global.self = undefined;
      expect(isWorker()).toBe(false);
    });
  });

  describe("isNodeEnv", () => {
    const realProcess = global.process;

    afterEach(() => {
      // Put the genuine `process` back after every test
      global.process = realProcess;
    });

    it("returns true in a real Node.js environment", () => {
      expect(isNodeEnv()).toBe(true);
    });

    it("returns false when the global `process` is missing (browser-like)", () => {
      global.process = undefined;
      expect(isNodeEnv()).toBe(false);
    });

    it("returns false when `process` exists but has no `versions.node`", () => {
      // Clone the real object so we don’t mutate the original
      global.process = { ...realProcess, versions: {} } as unknown as NodeJS.Process;
      expect(isNodeEnv()).toBe(false);
    });
  });
});

describe("getOriginFromURL", () => {
  it("returns null for null input", () => {
    expect(getOriginFromURL(null)).toBe(null);
  });

  it("returns origin for http URLs", () => {
    expect(getOriginFromURL("http://example.com/path")).toBe("http://example.com");
    expect(getOriginFromURL("http://example.com:8080/path")).toBe("http://example.com:8080");
  });

  it("returns origin for https URLs", () => {
    expect(getOriginFromURL("https://example.com/path")).toBe("https://example.com");
    expect(getOriginFromURL("https://example.com:443/path")).toBe("https://example.com");
  });

  it("handles URLs without paths", () => {
    expect(getOriginFromURL("http://example.com")).toBe("http://example.com");
  });

  it("handles file protocol", () => {
    expect(getOriginFromURL("file:///path/to/file")).toBe("file://");
  });

  it("handles URLs with default ports", () => {
    expect(getOriginFromURL("http://example.com:80/path")).toBe("http://example.com");
    expect(getOriginFromURL("https://example.com:443/path")).toBe("https://example.com");
  });
});
