import type { LogEntry, Logger } from "./types";

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "\x1b[36m",
  INFO: "\x1b[32m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function formatContext(context?: Record<string, unknown>): string | null {
  if (!context || Object.keys(context).length === 0) {
    return null;
  }

  const entries = Object.entries(context);
  const maxKeyLength = Math.max(...entries.map(([key]) => key.length));

  const lines = entries.map(([key, value]) => {
    const paddedKey = key.toUpperCase().padEnd(maxKeyLength);
    const formattedValue =
      typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);
    return `  ${DIM}${paddedKey}${RESET} ${formattedValue}`;
  });

  return lines.join("\n");
}

function formatLogEntry(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level] ?? "";
  const timestamp = formatTimestamp(entry.timestamp);
  const level = `[${BOLD}${color}${entry.level}${RESET}]`;
  const source = entry.source ? `${DIM}[${entry.source}]${RESET} ` : "";
  const message = `${BOLD}${entry.message}${RESET}`;

  const parts = [`${DIM}${timestamp}${RESET}`, level, `${source}${message}`];

  const contextBlock = formatContext(entry.context);
  if (contextBlock) {
    parts.push(`\n${contextBlock}`);
  }

  return parts.join(" ");
}

function formatErrorLog(entry: LogEntry, error?: unknown): string {
  const base = formatLogEntry(entry);

  if (!error) {
    return base;
  }

  if (error instanceof Error) {
    const errorBlock = [
      `\n${BOLD}${LEVEL_COLORS.ERROR}[ERROR DETAILS]${RESET}`,
      `  ${DIM}NAME${RESET}     ${error.name}`,
      `  ${DIM}MESSAGE${RESET}  ${error.message}`,
      `  ${DIM}STACK${RESET}`,
      ...(error.stack ?? "")
        .split("\n")
        .map((line) => `    ${DIM}${line}${RESET}`),
    ].join("\n");
    return `${base}\n${errorBlock}`;
  }

  const errorBlock = [
    `\n${BOLD}${LEVEL_COLORS.ERROR}[ERROR DETAILS]${RESET}`,
    `  ${DIM}VALUE${RESET} ${JSON.stringify(error, null, 2)}`,
  ].join("\n");
  return `${base}\n${errorBlock}`;
}

function formatTable(entries: LogEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const headers = ["TIMESTAMP", "LEVEL", "SOURCE", "MESSAGE"];
  const rows = entries.map((e) => [
    formatTimestamp(e.timestamp),
    e.level,
    e.source ?? "-",
    e.message,
  ]);

  const colWidths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => row[i]?.length ?? 0))
  );

  const headerRow = headers
    .map((h, i) => `${BOLD}${h.padEnd(colWidths[i])}${RESET}`)
    .join(" │ ");

  const separator = colWidths.map((w) => "─".repeat(w)).join("─┼─");

  const dataRows = rows.map((row) =>
    row.map((cell, i) => cell.padEnd(colWidths[i])).join(" │ ")
  );

  return [headerRow, separator, ...dataRows].join("\n");
}

export class ConsoleLogger implements Logger {
  private readonly entries: LogEntry[] = [];
  private readonly source: string;

  constructor(source = "CHORUS") {
    this.source = source;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "DEBUG",
      message,
      context,
      timestamp: new Date(),
      source: this.source,
    };
    this.entries.push(entry);
    console.log(formatLogEntry(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "INFO",
      message,
      context,
      timestamp: new Date(),
      source: this.source,
    };
    this.entries.push(entry);
    console.log(formatLogEntry(entry));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "WARN",
      message,
      context,
      timestamp: new Date(),
      source: this.source,
    };
    this.entries.push(entry);
    console.warn(formatLogEntry(entry));
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level: "ERROR",
      message,
      context,
      timestamp: new Date(),
      source: this.source,
    };
    this.entries.push(entry);
    console.error(formatErrorLog(entry, error));
  }

  captureEvent(event: string, properties?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "INFO",
      message: `[EVENT] ${event}`,
      context: properties,
      timestamp: new Date(),
      source: this.source,
    };
    this.entries.push(entry);
    console.log(formatLogEntry(entry));
  }

  captureException(
    error: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    this.error(`[EXCEPTION] ${message}`, error, context);
  }

  shutdown(): void {
    if (this.entries.length > 0) {
      console.log(`\n${BOLD}[LOG SUMMARY]${RESET}`);
      console.log(formatTable(this.entries));
      console.log(`\n${DIM}Total entries: ${this.entries.length}${RESET}\n`);
    }
  }
}
