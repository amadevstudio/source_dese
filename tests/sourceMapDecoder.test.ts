import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// Mock config before importing decodeFrame
vi.mock("../src/config/config.js", () => ({
  config: {
    port: 3000,
    nodeEnv: "test",
    sourcemapAssetsPath: path.resolve("tests/fixtures"),
  },
}));

import { decodeFrame } from "../src/utils/sourceMapDecoder.js";

describe("decodeFrame", () => {
  it("decodes a frame from a single-line bundle", () => {
    // test-bundle.js is single-line: `function o(){console.log("hello")}function l(){throw new Error("fail")}o();l();`
    // The sourcemap maps to _original.ts
    const result = decodeFrame({
      file: "test-bundle.js",
      line: 1,
      column: 1,
    });

    expect(result.error).toBeUndefined();
    expect(result.file).toContain("_original.ts");
    expect(result.line).toBeTypeOf("number");
    expect(result.originalFile).toBe("test-bundle.js");
  });

  it("decodes the greet function position", () => {
    // `function o()` starts at column 0 in the minified output
    // Should map to `function greet()` at line 1 in _original.ts
    const result = decodeFrame({
      file: "test-bundle.js",
      line: 1,
      column: 1,
      functionName: "o",
    });

    expect(result.error).toBeUndefined();
    expect(result.file).toContain("_original.ts");
    expect(result.line).toBe(1);
  });

  it("decodes the fail function position", () => {
    // `function l()` starts around column 35 in the minified output
    // Should map to `function fail()` at line 5 in _original.ts
    const result = decodeFrame({
      file: "test-bundle.js",
      line: 1,
      column: 35,
      functionName: "l",
    });

    expect(result.error).toBeUndefined();
    expect(result.file).toContain("_original.ts");
    expect(result.line).toBe(5);
  });

  it("handles single-line sourcemap with multi-line browser display", () => {
    // multiline-display.js has 3 lines but its .map has 1 mapping line
    // Browser shows line 2, col 1 — should be recalculated to absolute offset
    const result = decodeFrame({
      file: "multiline-display.js",
      line: 2,
      column: 1,
      functionName: "l",
    });

    expect(result.error).toBeUndefined();
    expect(result.file).toContain("_original.ts");
  });

  it("returns error for missing JS file", () => {
    const result = decodeFrame({
      file: "nonexistent.js",
      line: 1,
      column: 1,
    });

    expect(result.error).toBe("JS file not found: nonexistent.js");
  });

  it("returns error for missing sourcemap", () => {
    const result = decodeFrame({
      file: "_original.ts",
      line: 1,
      column: 1,
    });

    expect(result.error).toContain("Sourcemap not found");
  });

  it("preserves original frame metadata", () => {
    const result = decodeFrame({
      file: "test-bundle.js",
      line: 1,
      column: 1,
      functionName: "myFunc",
    });

    expect(result.originalFile).toBe("test-bundle.js");
    expect(result.originalLine).toBe(1);
    expect(result.originalColumn).toBe(1);
  });
});
