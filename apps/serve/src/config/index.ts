export interface ServerConfig {
  hostname: string;
  opencodeBaseUrl: string;
  opencodeDirectory: string;
  port: number;
}

export function loadConfig(): ServerConfig {
  const rawPort = process.env.PORT ?? "2000";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0 || port >= 65_536) {
    throw new Error(
      `Invalid PORT "${rawPort}": must be a number between 1 and 65535`
    );
  }

  return {
    port,
    hostname: process.env.HOSTNAME ?? "localhost",
    opencodeBaseUrl: process.env.OPENCODE_BASE_URL ?? "http://localhost:4096",
    opencodeDirectory: process.env.OPENCODE_DIRECTORY ?? process.cwd(),
  };
}
