import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import path from "path";

const PORT = 3987;
const BASE_URL = `http://localhost:${PORT}`;
const ASSETS_PATH = path.resolve("e2e/dist");

let server: ChildProcess;

async function waitForServer(url: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

beforeAll(async () => {
  server = spawn("node", ["dist/server.js"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      SOURCEMAP_ASSETS_PATH: ASSETS_PATH,
      NODE_ENV: "test",
    },
    stdio: "pipe",
  });

  await waitForServer(`${BASE_URL}/api-docs`);
});

afterAll(() => {
  server?.kill();
});

function decode(stack: string) {
  return fetch(`${BASE_URL}/api/trace/decode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stack }),
  }).then((r) => r.json());
}

describe("e2e: POST /api/trace/decode", () => {
  it("decodes a stack trace to original source locations", async () => {
    // app.js is single-line minified. Positions from the actual bundle:
    //   validateEmail throws TypeError at column ~108
    //   initApp calls validateEmail at column ~175
    //   bootstrap calls initApp at column ~218
    const stack = [
      "TypeError: Invalid email: not-an-email",
      "    at o (https://example.com/assets/app.js:1:108)",
      "    at e (https://example.com/assets/app.js:1:175)",
      "    at i (https://example.com/assets/app.js:1:218)",
    ].join("\n");

    const data = await decode(stack);

    expect(data.decoded).toHaveLength(3);

    // Frame 0: validateEmail in utils.ts
    expect(data.decoded[0].file).toContain("utils.ts");
    expect(data.decoded[0].line).toBeTypeOf("number");
    expect(data.decoded[0].originalFile).toBe(
      "https://example.com/assets/app.js"
    );

    // Frame 1: initApp in app.ts
    expect(data.decoded[1].file).toContain("app.ts");

    // Frame 2: bootstrap in app.ts
    expect(data.decoded[2].file).toContain("app.ts");
  });

  it("returns empty array for non-decodable stack", async () => {
    const data = await decode("Error: something\n    at foo (bar.js:1:1)");
    expect(data.decoded).toEqual([]);
  });

  it("handles stack traces with raw newlines in JSON", async () => {
    // Send raw newline inside JSON string value (not \\n escape)
    const body =
      '{"stack":"Error: test\\n    at o (https://example.com/assets/app.js:1:108)"}';

    const res = await fetch(`${BASE_URL}/api/trace/decode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.decoded.length).toBeGreaterThan(0);
    expect(data.decoded[0].file).toContain("utils.ts");
  });

  it("returns 400 for completely invalid JSON", async () => {
    const res = await fetch(`${BASE_URL}/api/trace/decode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all {{{",
    });

    expect(res.status).toBe(400);
  });
});
