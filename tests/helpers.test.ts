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

  it("returns empty array when no functions", () => {
    expect(extractMethods(noFunctions)).toEqual([]);
  });

  it("returns single function path", () => {
    expect(extractMethods(singleFunction)).toEqual(["foo"]);
  });

  it("returns multiple function paths", () => {
    expect(extractMethods(multipleFunctions).sort()).toEqual(["foo", "bar"].sort());
  });

  it("returns nested function paths", () => {
    expect(extractMethods(nestedFunctions).sort()).toEqual(["foo.bar.baz", "foo.foo"].sort());
  });

  it("handles null and undefined values", () => {
    const withNulls = {
      foo: null,
      bar: undefined,
      baz: () => {},
    };
    expect(extractMethods(withNulls)).toEqual(["baz"]);
  });

  it("handles arrays of functions", () => {
    const withArrays = {
      foo: [() => {}, () => {}],
      bar: () => {},
    };
    expect(extractMethods(withArrays).sort()).toEqual(["foo.0", "foo.1", "bar"].sort());
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
    const originalWindow = global.window;

    afterEach(() => {
      global.window = originalWindow;
    });

    it("returns true in Node.js environment", () => {
      // @ts-expect-error - mocking node env
      global.window = undefined;
      expect(isNodeEnv()).toBe(true);
    });

    it("returns false in browser environment", () => {
      // @ts-expect-error - mocking browser env
      global.window = {};
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
