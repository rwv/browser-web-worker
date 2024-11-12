import { Page as PuppeteerPage } from "puppeteer";

export async function createWorkerURLFromString(
  workerScriptString: string,
  page: PuppeteerPage
): Promise<string> {
  return await page.evaluate(
    (workerScriptString: string) =>
      URL.createObjectURL(
        new Blob([workerScriptString], { type: "text/javascript" })
      ),
    workerScriptString
  );
}
