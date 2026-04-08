# sourcemap-decode-service

Self-hosted microservice that decodes minified JavaScript stack traces back to original source locations using sourcemaps.

Drop-in replacement for uploading sourcemaps to Sentry/Bugsnag - keep your sourcemaps on your own server.

Built on top of [`sourcemap-decode`](https://www.npmjs.com/package/sourcemap-decode) — the core decoding library that handles stack trace parsing, sourcemap resolution, and single-line bundle support. This service is an HTTP wrapper that exposes the library as a REST API.

## Features

- **Framework-agnostic** - works with any JS bundler (Webpack, Vite, esbuild, Rollup)
- **Single-line bundle support** - correctly handles minified bundles where the browser displays line:col differently from the sourcemap
- **Recursive sourcemap lookup** - finds `.map` files in nested directory structures (Next.js, code splitting)
- **Lenient JSON parsing** - accepts stack traces with raw control characters (newlines, tabs) inside JSON strings
- **Swagger docs** - auto-generated OpenAPI docs at `/api-docs`
- **Docker-ready** - multi-stage Dockerfile included

## Quick start

```bash
npm install
npm run dev
```

Or with Docker:

```bash
docker build -t sourcemap-decode-service .
docker run -p 3000:3000 -v /path/to/your/assets:/app/assets:ro sourcemap-decode-service
```

## API

### `POST /api/trace/decode`

Decodes a minified stack trace.

**Request:**

```json
{
  "stack": "Error: Something went wrong\n    at App (https://example.com/assets/index-BHIGUbEz.js:263:19964)\n    at render (https://example.com/assets/vendor-abc123.js:1:42)"
}
```

**Response:**

```json
{
  "decoded": [
    {
      "file": "src/App.tsx",
      "line": 42,
      "column": 5,
      "function": "App",
      "originalFile": "index-BHIGUbEz.js",
      "originalLine": 263,
      "originalColumn": 19964
    },
    {
      "file": "node_modules/react-dom/cjs/react-dom.development.js",
      "line": 1234,
      "column": 12,
      "function": "render",
      "originalFile": "vendor-abc123.js",
      "originalLine": 1,
      "originalColumn": 42
    }
  ]
}
```

Frames that can't be decoded include an `error` field instead of `file`/`line`/`column`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `SOURCEMAP_ASSETS_PATH` | `./assets` | Directory containing `.js` and `.js.map` files |

## How it works

1. Parses the stack trace string to extract file references (`file.js:line:col`)
2. Looks up corresponding `.js.map` files in `SOURCEMAP_ASSETS_PATH`
3. Uses `@jridgewell/trace-mapping` to map minified positions back to original source
4. **Single-line bundle handling**: when the sourcemap has only one mapping line but the browser displays multiple lines, recalculates the absolute column offset

## Docker Compose example

```yaml
services:
  sourcemap-decoder:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./dist/assets:/app/assets:ro
    environment:
      - NODE_ENV=production
```

## Usage with your backend

Send a POST request from your error logging endpoint:

```python
# Python example
async def decode_stack(error_stack: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "http://sourcemap-decoder:3000/api/trace/decode",
            json={"stack": error_stack}
        )
        data = response.json()
        return "\n".join(
            f"    at {f.get('function', '?')} ({f.get('file', '?')}:{f.get('line', '?')}:{f.get('column', '?')})"
            for f in data["decoded"]
        )
```

```typescript
// Node.js example
const response = await fetch("http://sourcemap-decoder:3000/api/trace/decode", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ stack: errorStack }),
});
const { decoded } = await response.json();
```

## Why not Sentry / Bugsnag / Datadog?

| | This service | SaaS platforms | Self-hosted platforms (Sentry, GlitchTip) |
|---|---|---|---|
| **Cost** | $0 | $26–$150K+/yr | $0, but heavy infra |
| **Min RAM** | ~128 MB | N/A | 1–8+ GB |
| **Deploy time** | Minutes (1 container) | Minutes (signup) | Hours–days |
| **Sourcemaps stay on your server** | Yes | No (uploaded to vendor) | Yes |
| **Vendor lock-in** | None | Strong (SDK) | Moderate (SDK) |
| **External deps** | None (just Node.js) | N/A | PostgreSQL, Redis, Kafka... |

**Use this service when** you need sourcemap decoding without the overhead of a full error tracking platform — especially if sourcemaps contain sensitive IP, you need GDPR compliance, or you want to plug decoding into an existing logging pipeline (ELK, Loki, CloudWatch).

**Use Sentry/GlitchTip instead** if you need error grouping, alerting, dashboards, or session replay.

## Testing

```bash
npm test            # unit tests
npm run test:e2e    # e2e — starts the server, sends real HTTP requests
npm run test:all    # everything
npm run test:watch  # watch mode
```

## Acknowledgements

- [`sourcemap-decode`](https://github.com/amadevstudio/sourcemap_decoder) — the core library that powers this service
- [`@jridgewell/trace-mapping`](https://github.com/jridgewell/trace-mapping) by [Justin Ridgewell](https://github.com/jridgewell) — the fastest JavaScript sourcemap consumer available (~447K ops/sec), used internally by sourcemap-decode

## License

MIT
