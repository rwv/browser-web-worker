import { describe, it, expect, beforeAll, afterAll } from "vitest";
import puppeteer, { Page, Browser } from "puppeteer";
import { createWorkerURLFromString } from "./create-worker-url-from-string";

describe("createWorkerURLFromString", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    page = await browser.newPage();
    await page.goto("about:blank");
  });

  it("should create a blob URL from a worker script string", async () => {
    const workerScript = "console.log('Hello from worker');";
    const url = await createWorkerURLFromString(workerScript, page);

    // Verify the URL format
    expect(url).toMatch(/^blob:/);
  });

  it("should create a valid URL that can be used in a worker", async () => {
    const workerScript = `
      self.addEventListener('message', (e) => {
        self.postMessage(e.data);
      });
    `;

    const url = await createWorkerURLFromString(workerScript, page);

    // Verify the URL can be used to create a worker
    const workerExists = await page.evaluate((workerUrl) => {
      try {
        const worker = new Worker(workerUrl);
        worker.terminate();
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }, url);

    expect(workerExists).toBe(true);
  });

  afterAll(async () => {
    await browser.close();
  });
});
