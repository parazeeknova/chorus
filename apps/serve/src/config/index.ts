export interface ServerConfig {
  hostname: string;
  opencodeBaseUrl: string;
  opencodeDirectory: string;
  port: number;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 2000),
    hostname: process.env.HOSTNAME ?? "localhost",
    opencodeBaseUrl: process.env.OPENCODE_BASE_URL ?? "http://localhost:4096",
    opencodeDirectory: process.env.OPENCODE_DIRECTORY ?? process.cwd(),
  };
}
