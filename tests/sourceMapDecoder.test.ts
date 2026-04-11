import { describe, it, expect } from "vitest";
import path from "path";
import { decodeFrame, type StackFrame } from "sourcemap-decode";

const FIXTURES_PATH = path.resolve("tests/fixtures");

function resolve(file: string): string {
  return path.join(FIXTURES_PATH, path.basename(file) + ".map");
}

function decode(frame: StackFrame) {
  return decodeFrame(frame, resolve, false, /$/);
}

describe("decodeFrame (via sourcemap-decode)", () => {
  it("decodes a frame from a single-line bundle", () => {
    const result = decode({
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
    const result = decode({
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
    const result = decode({
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
    const result = decode({
      file: "multiline-display.js",
      line: 2,
      column: 1,
      functionName: "l",
    });

    expect(result.error).toBeUndefined();
    expect(result.file).toContain("_original.ts");
  });

  it("returns error for missing sourcemap", () => {
    const result = decode({
      file: "nonexistent.js",
      line: 1,
      column: 1,
    });

    expect(result.error).toContain("Sourcemap not found");
  });

  it("preserves original frame metadata", () => {
    const result = decode({
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
