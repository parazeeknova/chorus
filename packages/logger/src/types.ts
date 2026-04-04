export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  context?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  source?: string;
  timestamp: Date;
}

export interface LoggerConfig {
  env: "development" | "production";
  postHogApiHost?: string;
  postHogApiKey?: string;
  postHogProjectId?: string;
  releaseName?: string;
  releaseVersion?: string;
  sourceMapsEnabled?: boolean;
}

export interface Logger {
  captureEvent(event: string, properties?: Record<string, unknown>): void;
  captureException(
    error: Error | unknown,
    context?: Record<string, unknown>
  ): void;
  debug(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void;
  info(message: string, context?: Record<string, unknown>): void;
  shutdown(): void | Promise<void>;
  warn(message: string, context?: Record<string, unknown>): void;
}
