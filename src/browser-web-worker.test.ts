import { describe, it, expect, vi, beforeAll } from "vitest";
import puppeteer, { Page, Browser } from "puppeteer";
import { createWorkerURLFromString } from "./utils";
import { BrowserWebWorker } from "./browser-web-worker";

const testWorkerString = `
self.addEventListener('message', (event) => {
  // Send a message back to the main thread
  self.postMessage(event.data);
});
`;

describe("BrowserWebWorker", async () => {
  let browser: Browser;
  let page: Page;
  let workerScriptURL: string;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--enable-experimental-web-platform-features", "--no-sandbox"],
    });
    page = await browser.newPage();
    await page.goto("about:blank");
    workerScriptURL = await createWorkerURLFromString(testWorkerString, page);
  });

  it("should create a worker from string", async () => {
    const worker = new BrowserWebWorker({ workerScriptURL, page });
    await worker.initPromise;
    expect(worker).toBeDefined();
    expect(worker.postMessage).toBeDefined();
  });

  it("should handle message communication", async () => {
    const worker = new BrowserWebWorker({ workerScriptURL, page });
    await worker.initPromise;

    const messagePromise = new Promise<MessageEvent>((resolve) => {
      worker.onmessage = (event) => {
        resolve(event);
      };
    });

    const testData = { test: "Hello Worker!" };
    worker.postMessage(testData);

    const response = await messagePromise;
    expect(response.data).toEqual(testData);
  });

  it("should handle addEventListener for messages", async () => {
    const worker = new BrowserWebWorker({ workerScriptURL, page });
    await worker.initPromise;

    const messagePromise = new Promise<MessageEvent>((resolve) => {
      worker.addEventListener("message", (event) => {
        resolve(event as MessageEvent);
      });
    });

    const testData = { test: "Event Listener Test" };
    worker.postMessage(testData);

    const response = await messagePromise;
    expect(response.data).toEqual(testData);
  });

  it("should handle removeEventListener", async () => {
    const worker = new BrowserWebWorker({ workerScriptURL, page });
    await worker.initPromise;

    const listener = vi.fn();
    worker.addEventListener("message", listener);
    worker.removeEventListener("message", listener);

    worker.postMessage({ test: "Should not trigger" });

    // Wait a bit to ensure no message is processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(listener).not.toHaveBeenCalled();
  });

  it("should handle multiple event listeners", async () => {
    const worker = new BrowserWebWorker({ workerScriptURL, page });
    await worker.initPromise;

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    worker.addEventListener("message", listener1);
    worker.addEventListener("message", listener2);

    const messagePromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    worker.postMessage({ test: "Multiple Listeners" });

    await messagePromise;

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  // TODO: should properly terminate the worker

  it("should handle error events", async () => {
    // Create a worker with invalid JavaScript to trigger an error
    const invalidScript = "invalid javascript code {};";
    const invalidScriptURL = await createWorkerURLFromString(
      invalidScript,
      page,
    );

    const worker = new BrowserWebWorker({
      workerScriptURL: invalidScriptURL,
      page,
    });
    await worker.initPromise;

    const errorPromise = new Promise<ErrorEvent>((resolve) => {
      worker.onerror = (event) => {
        resolve(event);
      };
    });

    const error = await errorPromise;
    expect(error).toBeDefined();
    expect(error.type).toBe("error");
    expect(error.message).toBe(
      "Uncaught SyntaxError: Unexpected identifier 'javascript'",
    );
  });
});
