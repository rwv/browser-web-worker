import { Page as PuppeteerPage } from "puppeteer";
import { createWorkerURLFromString } from "./utils";
import { BrowserWebWorker } from "./browser-web-worker";
import fs from "fs/promises";

export async function createWorkerFromString(
  workerScriptString: string,
  page: PuppeteerPage,
) {
  const workerScriptURL = await createWorkerURLFromString(
    workerScriptString,
    page,
  );

  const worker = new BrowserWebWorker({ workerScriptURL, page });
  await worker.initPromise;
  return worker;
}

export async function createWorkerFromURL(
  workerScriptURL: string,
  page: PuppeteerPage,
) {
  const worker = new BrowserWebWorker({ workerScriptURL, page });
  await worker.initPromise;
  return worker;
}

export async function createWorkerFromFile(
  workerScriptPath: string,
  page: PuppeteerPage,
) {
  const workerContent = await fs.readFile(workerScriptPath, "utf8");

  const workerScriptURL = await createWorkerURLFromString(workerContent, page);
  return createWorkerFromURL(workerScriptURL, page);
}
