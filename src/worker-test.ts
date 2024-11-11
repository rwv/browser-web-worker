import { BrowserWorker } from "./browserWorker";
import fs from "fs/promises";

const workerScript = await fs.readFile("./src/test.worker.js", "utf8");

const worker: Worker = await BrowserWorker.createFromString(workerScript);


worker.postMessage({ foo: "bar" });

worker.onmessage = (message: MessageEvent) => {
    console.log(message);
};

await (new Promise((resolve) => setTimeout(resolve, 10000)))