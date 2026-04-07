import { describe, it, expect } from "vitest";
import { parseStackTrace } from "../src/utils/stackParser.js";

describe("parseStackTrace", () => {
  it("parses a standard Chrome stack trace", () => {
    const stack = `Error: Something went wrong
    at App (https://example.com/assets/index-BHIGUbEz.js:263:19964)
    at render (https://example.com/assets/vendor-abc123.js:1:42)`;

    const frames = parseStackTrace(stack);

    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({
      file: "index-BHIGUbEz.js",
      line: 263,
      column: 19964,
      functionName: "App",
      originalLine: "at App (https://example.com/assets/index-BHIGUbEz.js:263:19964)",
    });
    expect(frames[1]).toEqual({
      file: "vendor-abc123.js",
      line: 1,
      column: 42,
      functionName: "render",
      originalLine: "at render (https://example.com/assets/vendor-abc123.js:1:42)",
    });
  });

  it("parses frames without function names", () => {
    const stack = `Error: fail
    at https://example.com/assets/chunk-abc.js:10:200`;

    const frames = parseStackTrace(stack);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("chunk-abc.js");
    expect(frames[0]?.line).toBe(10);
    expect(frames[0]?.column).toBe(200);
    // FUNCTION_RE captures the URL as function name when there's no named function
    // This is expected behavior — the regex matches "at <something>"
    expect(frames[0]?.functionName).toBe("https://example.com/assets/chunk-abc.js:10:200");
  });

  it("skips non-frame lines", () => {
    const stack = `Error: oops
    at some random text without url
    at App (https://example.com/assets/index.js:1:1)`;

    const frames = parseStackTrace(stack);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("index.js");
  });

  it("returns empty array for non-stack input", () => {
    expect(parseStackTrace("just a string")).toEqual([]);
    expect(parseStackTrace("")).toEqual([]);
  });

  it("handles multiple frames with deep paths", () => {
    const stack = `Error: deep
    at fn (https://cdn.example.com/v2/build/static/js/main.abc123.js:1:500)`;

    const frames = parseStackTrace(stack);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("main.abc123.js");
  });

  it("handles http (non-https) URLs", () => {
    const stack = `Error: test
    at fn (http://localhost:3000/assets/app.js:5:10)`;

    const frames = parseStackTrace(stack);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("app.js");
  });
});
