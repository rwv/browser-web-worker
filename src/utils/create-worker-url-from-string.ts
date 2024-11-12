import { Page as PuppeteerPage } from "puppeteer";

export async function createWorkerURLFromString(
  workerScriptString: string,
  page: PuppeteerPage,
): Promise<string> {
  return await page.evaluate(
    /* v8 ignore start */
    (workerScriptString: string) =>
      URL.createObjectURL(
        new Blob([workerScriptString], { type: "text/javascript" }),
      ),
    /* v8 ignore stop */
    workerScriptString,
  );
}
