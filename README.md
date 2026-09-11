# Hapi Template (TypeScript)

Quick start new Node.js projects using Hapi.js and TypeScript.

## Prerequisites

Either:
- Docker & Docker Compose

Or:
- Node.js 24+

## Running locally

### Development (with file watching)

```
npm run start:dev
```

Starts the server on http://localhost:3000 and restarts on file changes.

### Debug mode

```
npm run start:debug
```

Same as dev but with the Node.js inspector on port 9229. Attach your debugger (VSCode launch configs included).

### Production mode

```
npm start
```

## Running with Docker

### Development

```
docker compose up
```

Mounts `src/` for live reload inside the container.

### Debug

```
npm run docker:debug
```

### Tests

```
npm run docker:test
```

Runs tests in a container with coverage output to `./test-output/`.

### Test watch

```
npm run docker:test:watch
```

## Testing

```
npm test              # Run tests with coverage (lints first)
npm run test:watch    # Watch mode
```

## Debugging

### Debugging the server locally

Use the **"Node: Launch"** VSCode launch config. It starts the server and opens a browser when ready.

### Debugging tests locally

Set breakpoints then use either VSCode launch config:

- **"Vitest: Debug"** — runs all tests with debugger attached
- **"Vitest: Debug Current File"** — runs only the open test file

Or from terminal:

```
npm run test:debug
```

This starts vitest with `--inspect-brk` (pauses before execution). Attach VSCode's debugger to port 9229.

### Debugging tests in Docker

```
docker compose -f compose.yaml -f compose.test.yaml run --rm -p 9229:9229 hapi-template-ts npm run test:debug
```

Then use the **"Docker: Attach"** VSCode launch config to connect.

## Type checking

```
npm run typecheck
```

TypeScript is used for type-checking only — Node 24 runs `.ts` files natively.

## Linting

```
npm run test:lint
```
