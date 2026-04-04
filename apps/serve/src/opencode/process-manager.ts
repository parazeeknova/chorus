import { createLogger } from "@chorus/logger";

const logger = createLogger({ env: "development" }, "SERVE");

const OPENCODE_PORT = 4096;
const OPENCODE_HOSTNAME = "127.0.0.1";

async function isPortInUse(port: number, host: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`http://${host}:${port}`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status === 404 || res.status === 400;
  } catch {
    return false;
  }
}

export class OpenCodeProcessManager {
  #proc: ReturnType<typeof Bun.spawn> | null = null;
  readonly #port: number;
  readonly #hostname: string;
  readonly #directory: string;

  constructor(options: {
    port?: number;
    hostname?: string;
    directory: string;
  }) {
    this.#port = options.port ?? OPENCODE_PORT;
    this.#hostname = options.hostname ?? OPENCODE_HOSTNAME;
    this.#directory = options.directory;
  }

  async start(): Promise<void> {
    const inUse = await isPortInUse(this.#port, this.#hostname);
    if (inUse) {
      logger.info("opencode-already-running", {
        port: this.#port,
        hostname: this.#hostname,
      });
      return;
    }

    logger.info("opencode-starting", {
      port: this.#port,
      hostname: this.#hostname,
      directory: this.#directory,
    });

    this.#proc = Bun.spawn(
      [
        "opencode",
        "serve",
        "--port",
        String(this.#port),
        "--hostname",
        this.#hostname,
      ],
      {
        cwd: this.#directory,
        env: { ...process.env },
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    this.#consumeStream(
      this.#proc.stdout as ReadableStream<Uint8Array>,
      "opencode-stdout"
    );
    this.#consumeStream(
      this.#proc.stderr as ReadableStream<Uint8Array>,
      "opencode-stderr"
    );

    this.#proc.exited
      .then((code) => {
        logger.info("opencode-exited", { code });
        this.#proc = null;
      })
      .catch((error) => {
        logger.error(
          "opencode-error",
          error instanceof Error ? error : undefined
        );
        this.#proc = null;
      });
  }

  async #consumeStream(
    stream: ReadableStream<Uint8Array>,
    label: string
  ): Promise<void> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const text = new TextDecoder().decode(value).trim();
        if (text) {
          logger.debug(label, { data: text });
        }
      }
    } catch {
      // stream closed, ignore
    }
  }

  stop(): void {
    if (this.#proc) {
      logger.info("opencode-stopping");
      this.#proc.kill("SIGTERM");
      this.#proc = null;
    }
  }

  forceKill(): void {
    if (this.#proc) {
      logger.info("opencode-force-kill");
      this.#proc.kill("SIGKILL");
      this.#proc = null;
    }
  }
}
