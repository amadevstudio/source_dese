import { describe, it, expect, vi } from "vitest";
import express from "express";
import {
  lenientJsonParser,
  parseLenientJson,
} from "../src/middlewares/jsonErrorHandler.js";

// Helper: run middleware chain against a fake request
function createTestApp() {
  const app = express();
  app.use(lenientJsonParser);
  app.use(parseLenientJson);
  app.post("/test", (req, res) => {
    res.json({ body: req.body });
  });
  return app;
}

async function postJson(app: express.Express, body: string) {
  const { default: request } = await import("supertest" as string).catch(
    () => ({ default: null })
  );

  // Fallback: use raw http if supertest is not available
  return new Promise<{ status: number; body: unknown }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;

      const http = require("http");
      const req = http.request(
        { hostname: "127.0.0.1", port, path: "/test", method: "POST", headers: { "Content-Type": "application/json" } },
        (res: { statusCode: number; on: Function }) => {
          let data = "";
          res.on("data", (chunk: string) => (data += chunk));
          res.on("end", () => {
            server.close();
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          });
        }
      );
      req.write(body);
      req.end();
    });
  });
}

describe("lenientJsonParser + parseLenientJson", () => {
  it("parses valid JSON normally", async () => {
    const app = createTestApp();
    const res = await postJson(app, '{"stack":"Error: test"}');

    expect(res.status).toBe(200);
    expect((res.body as { body: { stack: string } }).body.stack).toBe("Error: test");
  });

  it("handles JSON with raw newlines inside strings", async () => {
    const app = createTestApp();
    // Raw newline inside JSON string value — invalid JSON but common in stack traces
    const body = '{"stack":"Error: test\n    at foo (https://example.com/assets/app.js:1:1)"}';

    const res = await postJson(app, body);

    expect(res.status).toBe(200);
    const parsed = (res.body as { body: { stack: string } }).body;
    expect(parsed.stack).toContain("Error: test");
    expect(parsed.stack).toContain("at foo");
  });

  it("handles JSON with raw tabs inside strings", async () => {
    const app = createTestApp();
    const body = '{"stack":"Error:\ttab"}';

    const res = await postJson(app, body);

    expect(res.status).toBe(200);
    const parsed = (res.body as { body: { stack: string } }).body;
    expect(parsed.stack).toContain("Error:");
    expect(parsed.stack).toContain("tab");
  });

  it("returns 400 for completely invalid JSON", async () => {
    const app = createTestApp();
    const res = await postJson(app, "not json at all {{{");

    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe("Invalid JSON format");
  });
});
