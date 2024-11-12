# Browser Web Worker

[![Build](https://github.com/rwv/browser-web-worker/actions/workflows/build.yml/badge.svg)](https://github.com/rwv/browser-web-worker/actions/workflows/build.yml)
[![NPM Version](https://img.shields.io/npm/v/browser-web-worker)](https://www.npmjs.com/package/browser-web-worker)
[![GitHub License](https://img.shields.io/github/license/rwv/browser-web-worker)](https://github.com/rwv/browser-web-worker/blob/main/LICENSE)

Run Web Workers in Node.js using a real Chrome browser via Puppeteer.

## Features

- Create Web Workers from strings, files, or URLs
- Full Web Worker API support including message passing
- Event handling (message, error, etc.)
- Built on top of Puppeteer for real browser compatibility
- TypeScript support
- Comprehensive test coverage

## Installation

```bash
pnpm add browser-web-worker puppeteer
```

## Usage

### Basic Example

```typescript
import { createWorkerFromString } from "browser-web-worker";
import puppeteer from "puppeteer";

// Launch browser
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto("about:blank");

// Create a worker from a string
const workerScript = `self.addEventListener('message', (event) => { self.postMessage(event.data); });`;
const worker = await createWorkerFromString(workerScript, page);

// Set up message handler
worker.onmessage = (event) => {
  console.log("Received:", event.data);
};
// Send a message to the worker
worker.postMessage({ hello: "world" });

// Clean up
await worker.terminate();
await browser.close();
```

### Creating Workers

You can create workers in three ways:

```typescript
import {
  createWorkerFromString,
  createWorkerFromFile,
  createWorkerFromURL,
} from "browser-web-worker";

// 1. From a string
const worker1 = await createWorkerFromString(workerScript, page);
// 2. From a file
const worker2 = await createWorkerFromFile("./path/to/worker.js", page);
// 3. From a URL, make sure the worker url is the same origin as the page
const worker3 = await createWorkerFromURL(
  "https://example.com/worker.js",
  page,
);
```

## TODOs

- Fix origin check to allow worker from `file://` scheme and handle cross-origin worker scripts securely
- Add support for transferable objects in postMessage (Blob, ArrayBuffer, MessagePort, etc.)
- Implement proper worker termination with cleanup of all resources and event listeners
- Add examples for common use cases in documentation

## License

MIT
