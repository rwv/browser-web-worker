import { Page as PuppeteerPage } from "puppeteer";

type WorkerKey = `worker-${string}`;
type NodeOnMessageKey = `nodeOnMessage-${string}`;
type NodeOnErrorKey = `nodeOnError-${string}`;

declare global {
  interface Window {
    [key: WorkerKey]: Worker;
    [key: NodeOnMessageKey]: (message: MessageEvent) => void;
    [key: NodeOnErrorKey]: (error: ErrorEvent) => void;
  }
}

export class BrowserWorker implements Worker, EventTarget {
  private readonly page: PuppeteerPage;
  private readonly workerScriptURL: string;
  private readonly eventListeners: Map<
    string,
    Set<EventListenerOrEventListenerObject>
  > = new Map();
  private isTerminated = false;
  readonly workerID: string;
  readonly workerObjectKey: `worker-${string}`;
  readonly nodeOnMessageObjectKey: `nodeOnMessage-${string}`;
  readonly nodeOnErrorObjectKey: `nodeOnError-${string}`;
  readonly initPromise: Promise<void>;

  // Implementing Worker

  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/message_event) */
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/messageerror_event) */
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorker/error_event) */
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;

  constructor(options: { workerScriptURL: string; page: PuppeteerPage }) {
    this.workerScriptURL = options.workerScriptURL;
    this.page = options.page;
    this.workerID = crypto.randomUUID();
    this.workerObjectKey = `worker-${this.workerID}`;
    this.nodeOnMessageObjectKey = `nodeOnMessage-${this.workerID}`;
    this.nodeOnErrorObjectKey = `nodeOnError-${this.workerID}`;
    this.initPromise = this.init();
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    // Expose functions to receive messages and errors from the worker
    await this.page.exposeFunction(
      this.nodeOnMessageObjectKey,
      (event: MessageEvent) => {
        if (this.onmessage) {
          this.onmessage(event);
        }
        this.dispatchEvent(new MessageEvent("message", { data: event.data }));
      }
    );

    await this.page.exposeFunction(
      this.nodeOnErrorObjectKey,
      (error: ErrorEvent) => {
        if (this.onerror) {
          this.onerror(error);
        }
        this.dispatchEvent(new ErrorEvent("error", { ...error }));
      }
    );

    // Set up the worker
    const workerKey = this.workerObjectKey;
    const messageKey = this.nodeOnMessageObjectKey;
    const errorKey = this.nodeOnErrorObjectKey;

    await this.page.evaluate(
      async (
        workerScriptURL: string,
        workerKey: WorkerKey,
        nodeMessageKey: NodeOnMessageKey,
        nodeErrorMessageKey: NodeOnErrorKey
      ) => {
        // Create a worker
        window[workerKey] = new Worker(workerScriptURL);

        // Forward messages from the worker to Node.js
        window[workerKey].onmessage = (e: MessageEvent) => {
          window[nodeMessageKey]({ data: e.data } as MessageEvent);
        };

        // Forward errors from the worker to Node.js
        window[workerKey].onerror = (e: ErrorEvent) => {
          window[nodeErrorMessageKey]({
            ...e,
            type: "error",
            error: e.error,
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
          });
        };
      },
      this.workerScriptURL,
      workerKey,
      messageKey,
      errorKey
    );
  }

  /**
   * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/postMessage)
   */
  postMessage(message: any) {
    const workerKey = this.workerObjectKey;
    return this.page.evaluate(
      (msg, workerKey: WorkerKey) => {
        window[workerKey].postMessage(msg);
      },
      message,
      workerKey
    );
  }

  async terminate() {
    if (this.isTerminated) return;
    this.isTerminated = true;

    const workerKey = this.workerObjectKey;
    await this.page.evaluate((workerKey: WorkerKey) => {
      window[workerKey].terminate();
    }, workerKey);

    // remove exposed functions
    await this.page.removeExposedFunction(this.nodeOnMessageObjectKey);
    await this.page.removeExposedFunction(this.nodeOnErrorObjectKey);
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
