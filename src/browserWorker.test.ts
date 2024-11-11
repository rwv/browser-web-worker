import { describe, it, expect, vi } from "vitest";
import { BrowserWorker } from "./browserWorker";
import fs from "fs/promises";

describe("BrowserWorker", async () => {
  const workerScript = await fs.readFile("./src/test.worker.js", "utf8");

  it("should create a worker from string", async () => {
    const worker = await BrowserWorker.createFromString(workerScript);
    expect(worker).toBeDefined();
    expect(worker.postMessage).toBeDefined();
  });

  it("should handle message communication", async () => {
    const worker = await BrowserWorker.createFromString(workerScript);

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
    const worker = await BrowserWorker.createFromString(workerScript);

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
    const worker = await BrowserWorker.createFromString(workerScript);

    const listener = vi.fn();
    worker.addEventListener("message", listener);
    worker.removeEventListener("message", listener);

    worker.postMessage({ test: "Should not trigger" });

    // Wait a bit to ensure no message is processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(listener).not.toHaveBeenCalled();
  });

  it("should handle multiple event listeners", async () => {
    const worker = await BrowserWorker.createFromString(workerScript);

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

    const worker = await BrowserWorker.createFromString(invalidScript);
    const errorPromise = new Promise<ErrorEvent>((resolve) => {
      worker.onerror = (event) => {
        resolve(event);
      };
    });

    const error = await errorPromise;
    expect(error).toBeDefined();
    expect(error.type).toBe("error");
    expect(error.message).toBe(
      "Uncaught SyntaxError: Unexpected identifier 'javascript'"
    );
  });
});
