import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs/promises";
import puppeteer, { Page, Browser } from "puppeteer";
import { createWorkerFromString, createWorkerFromFile } from "./create";
import { tmpdir } from "os";
import path from "path";

const testWorkerString = `
self.addEventListener('message', (event) => {
  // Send a message back to the main thread
  self.postMessage(event.data);
});
`;

describe("create worker", async () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--enable-experimental-web-platform-features", "--no-sandbox"],
    });
    page = await browser.newPage();
    await page.goto("about:blank");
  });

  it("should handle message communication using createWorkerFromString", async () => {
    const worker = await createWorkerFromString(testWorkerString, page);

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

  it("should handle message communication using createWorkerFromFile", async () => {
    const filePath = path.join(tmpdir(), `${crypto.randomUUID()}.js`);
    await fs.writeFile(filePath, testWorkerString);
    const worker = await createWorkerFromFile(filePath, page);
    const messagePromise = new Promise<MessageEvent>((resolve) => {
      worker.onmessage = (event) => {
        resolve(event);
      };
    });

    const testData = { test: "Hello Worker!" };
    worker.postMessage(testData);

    const response = await messagePromise;
    expect(response.data).toEqual(testData);

    await fs.unlink(filePath);
  });
});
