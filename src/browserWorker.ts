// src/browserWorker.ts
import puppeteer, {
  Browser as PuppeteerBrowser,
  Page as PuppeteerPage,
} from "puppeteer";

declare global {
  interface Window {
    worker: Worker;
    nodeOnMessage: (message: MessageEvent) => void;
    nodeOnError: (error: ErrorEvent) => void;
  }
}

export class BrowserWorker implements Worker, EventTarget {
  private browser!: PuppeteerBrowser;
  private page!: PuppeteerPage;
  private readonly workerScriptString: string;
  private readonly eventListeners: Map<
    string,
    Set<EventListenerOrEventListenerObject>
  > = new Map();
  private isTerminated = false;

  // Implementing Worker

  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/message_event) */
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/messageerror_event) */
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorker/error_event) */
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;

  /**
   * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/postMessage)
   */
  postMessage(message: any) {
    return this.page.evaluate((msg) => {
      window.worker.postMessage(msg);
    }, message);
  }

  async terminate() {
    if (this.isTerminated) return;
    this.isTerminated = true;

    await this.page.evaluate(() => {
      window.worker.terminate();
    });
    await this.browser.close();
  }

  private constructor(workerScriptString: string) {
    this.workerScriptString = workerScriptString;
  }

  static async createFromString(workerScriptString: string): Promise<Worker> {
    const worker = new BrowserWorker(workerScriptString);
    await worker.init();
    return worker;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--enable-experimental-web-platform-features", "--no-sandbox"],
    });

    this.page = (await this.browser.pages())[0];

    // Expose functions to receive messages and errors from the worker
    await this.page.exposeFunction("nodeOnMessage", (event: MessageEvent) => {
      if (this.onmessage) {
        this.onmessage(event);
      }
      this.dispatchEvent(new MessageEvent("message", { data: event.data }));
    });

    await this.page.exposeFunction("nodeOnError", (error: ErrorEvent) => {
      if (this.onerror) {
        this.onerror(error);
      }
      this.dispatchEvent(new ErrorEvent("error", { error }));
    });

    // Load a blank page
    await this.page.goto("about:blank");

    // Set up the worker
    await this.page.evaluate(async (workerScript) => {
      const workerBlob = new Blob([workerScript], { type: "text/javascript" });
      const workerScriptUrl = URL.createObjectURL(workerBlob);

      // Create a worker
      window.worker = new Worker(workerScriptUrl);

      // Forward messages from the worker to Node.js
      window.worker.onmessage = (e: MessageEvent) => {
        window.nodeOnMessage({ data: e.data } as MessageEvent);
      };

      // Forward errors from the worker to Node.js
      window.worker.onerror = (e: ErrorEvent) => {
        window.nodeOnError({
          ...e,
          type: "error",
          error: e.error,
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        });
      };
    }, this.workerScriptString);
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!listener) return;

    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    this.eventListeners.get(type)!.add(listener);

    // Special handling for 'message' and 'error' events
    if (type === "message") {
      this.onmessage = (ev: MessageEvent) => {
        if (typeof listener === "function") {
          listener(ev);
        } else {
          listener.handleEvent(ev);
        }
      };
    } else if (type === "error") {
      this.onerror = (ev: ErrorEvent) => {
        if (typeof listener === "function") {
          listener(ev);
        } else {
          listener.handleEvent(ev);
        }
      };
    }
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void {
    if (!listener) return;

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(type);
      }
    }

    // Special handling for 'message' and 'error' events
    if (type === "message" && this.onmessage) {
      this.onmessage = null;
    } else if (type === "error" && this.onerror) {
      this.onerror = null;
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (!listeners) return true;

    for (const listener of listeners) {
      if (typeof listener === "function") {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    }

    return !event.defaultPrevented;
  }
}
