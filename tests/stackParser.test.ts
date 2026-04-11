import { describe, it, expect } from "vitest";
import { parseStackTrace } from "sourcemap-decode";

// The library's default pattern matches any .js:line:col
const DEFAULT_PATTERN = /([^\s()"']+\.js):(\d+):(\d+)/g;

describe("parseStackTrace (via sourcemap-decode)", () => {
  it("parses a standard Chrome stack trace", () => {
    const stack = `Error: Something went wrong
    at App (https://example.com/assets/index-BHIGUbEz.js:263:19964)
    at render (https://example.com/assets/vendor-abc123.js:1:42)`;

    const frames = parseStackTrace(stack, DEFAULT_PATTERN);

    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({
      file: "https://example.com/assets/index-BHIGUbEz.js",
      line: 263,
      column: 19964,
      functionName: "App",
    });
    expect(frames[1]).toMatchObject({
      file: "https://example.com/assets/vendor-abc123.js",
      line: 1,
      column: 42,
      functionName: "render",
    });
  });

  it("parses frames without function names", () => {
    const stack = `Error: fail
    at https://example.com/assets/chunk-abc.js:10:200`;

    const frames = parseStackTrace(stack, DEFAULT_PATTERN);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("https://example.com/assets/chunk-abc.js");
    expect(frames[0]?.line).toBe(10);
    expect(frames[0]?.column).toBe(200);
  });

  it("skips non-frame lines", () => {
    const stack = `Error: oops
    at some random text without url
    at App (https://example.com/assets/index.js:1:1)`;

    const frames = parseStackTrace(stack, DEFAULT_PATTERN);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("https://example.com/assets/index.js");
  });

  it("returns empty array for non-stack input", () => {
    expect(parseStackTrace("just a string", DEFAULT_PATTERN)).toEqual([]);
    expect(parseStackTrace("", DEFAULT_PATTERN)).toEqual([]);
  });

  it("handles multiple frames with deep paths", () => {
    const stack = `Error: deep
    at fn (https://cdn.example.com/v2/build/static/js/main.abc123.js:1:500)`;

    const frames = parseStackTrace(stack, DEFAULT_PATTERN);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe(
      "https://cdn.example.com/v2/build/static/js/main.abc123.js"
    );
  });

  it("handles http (non-https) URLs", () => {
    const stack = `Error: test
    at fn (http://localhost:3000/assets/app.js:5:10)`;

    const frames = parseStackTrace(stack, DEFAULT_PATTERN);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.file).toBe("http://localhost:3000/assets/app.js");
  });
});
