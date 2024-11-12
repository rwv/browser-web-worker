# Browser Worker

[![Build](https://github.com/rwv/browser-worker/actions/workflows/build.yml/badge.svg)](https://github.com/rwv/browser-worker/actions/workflows/build.yml)

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
pnpm add browser-worker puppeteer
```

## Usage

### Basic Example

```typescript
import { createWorkerFromString } from "browser-worker";
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
} from "browser-worker";

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

## License

MIT
